"""
capture_live.py — Live packet capture using Scapy + npcap (Windows).

Usage:
  python capture_live.py --output <path> --duration <secs>
                         --interface <iface> [--filter <bpf>]
                         [--stats-interval <secs>]

Prints JSON lines to stdout so the Node.js parent process can
parse them in real-time via readline on the child's stdout pipe.

Exit codes:
  0  — success
  1  — error (details in the final JSON line printed to stdout)
"""

import argparse
import json
import os
import sys
import threading
import time

# ─── Argument Parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='Live PCAP capture via scapy')
parser.add_argument('--output',         required=True,  help='Output .pcap file path')
parser.add_argument('--duration',       required=True,  type=int, help='Capture duration in seconds')
parser.add_argument('--interface',      required=True,  help='Network interface name')
parser.add_argument('--filter',         default='',     help='BPF filter string')
parser.add_argument('--stats-interval', default=1,      type=int,  dest='stats_interval',
                    help='How often to print stats (seconds)')
args = parser.parse_args()


def emit(obj: dict) -> None:
    """Print a JSON object to stdout with flush so Node.js readline picks it up."""
    print(json.dumps(obj), flush=True)


def emit_error(message: str) -> None:
    emit({"type": "error", "message": message})
    sys.exit(1)


# ─── npcap / Scapy availability check ──────────────────────────────────────────
try:
    # Suppress scapy's own noisy warnings to stderr only
    import logging
    logging.getLogger("scapy.runtime").setLevel(logging.ERROR)
    from scapy.all import sniff, wrpcap, get_if_list  # type: ignore
except ImportError:
    emit_error("scapy is not installed. Run: pip install scapy")

# ─── Interface validation ───────────────────────────────────────────────────────
try:
    available_interfaces = get_if_list()
except Exception:
    emit_error("npcap not installed or insufficient permissions to list interfaces")

if args.interface not in available_interfaces:
    # Also try a partial / friendly-name match
    matches = [i for i in available_interfaces if args.interface.lower() in i.lower()]
    if matches:
        args.interface = matches[0]
    else:
        emit_error(f"Interface not found: {args.interface}. Available: {available_interfaces}")

# ─── Capture State ─────────────────────────────────────────────────────────────
captured_packets: list = []
total_bytes: int = 0
start_time: float = time.time()
lock = threading.Lock()
stop_event = threading.Event()


def packet_callback(pkt) -> None:
    """Called for every captured packet."""
    global total_bytes
    with lock:
        captured_packets.append(pkt)
        try:
            total_bytes += len(pkt)
        except Exception:
            pass


# ─── Stats Reporter Thread ──────────────────────────────────────────────────────
def stats_reporter() -> None:
    """Prints a stats JSON line every stats_interval seconds until stop_event."""
    prev_count = 0
    while not stop_event.is_set():
        stop_event.wait(timeout=args.stats_interval)
        elapsed = int(time.time() - start_time)
        with lock:
            current_count = len(captured_packets)
            current_bytes = total_bytes
        pps = current_count - prev_count
        prev_count = current_count
        emit({
            "type":    "stats",
            "packets": current_count,
            "bytes":   current_bytes,
            "elapsed": elapsed,
            "pps":     pps,
        })


# ─── Start Reporter ─────────────────────────────────────────────────────────────
reporter_thread = threading.Thread(target=stats_reporter, daemon=True)
reporter_thread.start()

# ─── Start Capture ──────────────────────────────────────────────────────────────
try:
    sniff(
        iface=args.interface,
        prn=packet_callback,
        filter=args.filter if args.filter else None,
        timeout=args.duration,
        store=False,          # we store manually to control memory
    )
except PermissionError:
    stop_event.set()
    emit_error("npcap not installed or insufficient permissions")
except OSError as exc:
    stop_event.set()
    emit_error(f"Capture failed: {exc}")

# ─── Stop Reporter ──────────────────────────────────────────────────────────────
stop_event.set()
reporter_thread.join(timeout=3)

# ─── Write PCAP ─────────────────────────────────────────────────────────────────
with lock:
    final_count = len(captured_packets)
    final_bytes = total_bytes
    pkts_snapshot = list(captured_packets)

try:
    # Ensure output directory exists
    out_dir = os.path.dirname(os.path.abspath(args.output))
    os.makedirs(out_dir, exist_ok=True)

    if pkts_snapshot:
        wrpcap(args.output, pkts_snapshot)
    else:
        # Write an empty-but-valid pcap (24-byte global header)
        PCAP_GLOBAL_HEADER = (
            b'\xd4\xc3\xb2\xa1'  # magic number (little-endian)
            b'\x02\x00\x04\x00'  # major/minor version
            b'\x00\x00\x00\x00'  # GMT offset
            b'\x00\x00\x00\x00'  # timestamp accuracy
            b'\xff\xff\x00\x00'  # snap length (65535)
            b'\x01\x00\x00\x00'  # link type (Ethernet)
        )
        with open(args.output, 'wb') as f:
            f.write(PCAP_GLOBAL_HEADER)

except Exception as exc:
    emit_error(f"Failed to write PCAP file: {exc}")

# ─── Final Summary ──────────────────────────────────────────────────────────────
elapsed_total = int(time.time() - start_time)
emit({
    "type":     "done",
    "packets":  final_count,
    "bytes":    final_bytes,
    "duration": elapsed_total,
    "output":   args.output,
})
sys.exit(0)
