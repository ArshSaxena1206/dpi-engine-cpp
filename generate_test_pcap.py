#!/usr/bin/env python3
"""
Generate a test PCAP file with various protocols for DPI testing.
Includes TLS Client Hello with SNI, HTTP, DNS, etc.
"""

import struct
import random
import argparse
import os

class PCAPWriter:
    def __init__(self, filename):
        self.file = open(filename, 'wb')
        self.write_global_header()
        self.timestamp = 1700000000
        
    def write_global_header(self):
        # Magic, version 2.4, timezone 0, sigfigs 0, snaplen 65535, linktype Ethernet
        header = struct.pack('<IHHIIII', 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1)
        self.file.write(header)
        
    def write_packet(self, data):
        ts_sec = self.timestamp
        ts_usec = random.randint(0, 999999)
        self.timestamp += 1
        
        pkt_header = struct.pack('<IIII', ts_sec, ts_usec, len(data), len(data))
        self.file.write(pkt_header)
        self.file.write(data)
        
    def close(self):
        self.file.close()


def create_ethernet_header(src_mac, dst_mac, ethertype=0x0800):
    return bytes.fromhex(dst_mac.replace(':', '')) + \
           bytes.fromhex(src_mac.replace(':', '')) + \
           struct.pack('>H', ethertype)


def create_ip_header(src_ip, dst_ip, protocol, payload_len):
    version_ihl = 0x45
    tos = 0
    total_len = 20 + payload_len
    ident = random.randint(1, 65535)
    flags_frag = 0x4000  # Don't fragment
    ttl = 64
    checksum = 0
    
    header = struct.pack('>BBHHHBBH',
                         version_ihl, tos, total_len,
                         ident, flags_frag,
                         ttl, protocol, checksum)
    
    header += bytes([int(x) for x in src_ip.split('.')])
    header += bytes([int(x) for x in dst_ip.split('.')])
    
    return header


def create_tcp_header(src_port, dst_port, seq, ack, flags, payload_len=0):
    data_offset = 5 << 4  # 5 * 4 = 20 bytes
    window = 65535
    checksum = 0
    urgent = 0
    
    return struct.pack('>HHIIBBHHH',
                       src_port, dst_port,
                       seq, ack,
                       data_offset, flags,
                       window, checksum, urgent)


def create_udp_header(src_port, dst_port, payload_len):
    length = 8 + payload_len
    checksum = 0
    return struct.pack('>HHHH', src_port, dst_port, length, checksum)


def create_tls_client_hello(sni):
    """
    Create a TLS Client Hello packet containing a Server Name Indication (SNI) extension.
    
    What is SNI?
    Server Name Indication (SNI) is an extension to the TLS protocol that indicates
    which hostname the client is attempting to connect to at the start of the handshaking process.
    
    Why is it used?
    It allows a server to present multiple certificates on the same IP address and TCP port,
    enabling multiple secure websites to be served off the same IP without requiring
    all sites to use the same certificate.
    
    How it ties into the DPI pipeline:
    Since the SNI is transmitted in plaintext during the initial Client Hello message
    (before the encrypted channel is established), the DPI engine can inspect this packet,
    extract the domain name (e.g., "www.youtube.com"), and use it to classify the application
    or apply domain-based blocking rules.
    """
    
    # SNI extension
    sni_bytes = sni.encode('ascii')
    sni_entry = struct.pack('>BH', 0, len(sni_bytes)) + sni_bytes
    sni_list = struct.pack('>H', len(sni_entry)) + sni_entry
    sni_ext = struct.pack('>HH', 0x0000, len(sni_list)) + sni_list
    
    # Supported versions extension (TLS 1.3)
    supported_versions = struct.pack('>HHB', 0x002b, 3, 2) + struct.pack('>H', 0x0304)
    
    # All extensions
    extensions = sni_ext + supported_versions
    extensions_data = struct.pack('>H', len(extensions)) + extensions
    
    # Client Hello body
    client_version = struct.pack('>H', 0x0303)  # TLS 1.2
    random_bytes = bytes([random.randint(0, 255) for _ in range(32)])
    session_id = struct.pack('B', 0)  # No session ID
    cipher_suites = struct.pack('>H', 4) + struct.pack('>HH', 0x1301, 0x1302)  # TLS_AES_128_GCM, TLS_AES_256_GCM
    compression = struct.pack('BB', 1, 0)  # No compression
    
    client_hello_body = client_version + random_bytes + session_id + cipher_suites + compression + extensions_data
    
    # Handshake header
    handshake = struct.pack('B', 0x01)  # Client Hello
    handshake += struct.pack('>I', len(client_hello_body))[1:]  # 3-byte length
    handshake += client_hello_body
    
    # TLS record header
    record = struct.pack('B', 0x16)  # Handshake
    record += struct.pack('>H', 0x0301)  # TLS 1.0 for record layer
    record += struct.pack('>H', len(handshake))
    record += handshake
    
    return record


def create_http_request(host, path='/'):
    return f"GET {path} HTTP/1.1\r\nHost: {host}\r\nUser-Agent: DPI-Test/1.0\r\nAccept: */*\r\n\r\n".encode()


def create_dns_query(domain):
    # Transaction ID
    txid = struct.pack('>H', random.randint(1, 65535))
    # Flags: standard query
    flags = struct.pack('>H', 0x0100)
    # Questions: 1, Answers: 0, Authority: 0, Additional: 0
    counts = struct.pack('>HHHH', 1, 0, 0, 0)
    
    # Question section
    question = b''
    for label in domain.split('.'):
        question += struct.pack('B', len(label)) + label.encode()
    question += struct.pack('B', 0)  # Null terminator
    question += struct.pack('>HH', 1, 1)  # Type A, Class IN
    
    return txid + flags + counts + question


def main():
    parser = argparse.ArgumentParser(
        description='Generate a test PCAP file with various protocols for DPI testing.'
    )
    parser.add_argument('--output', default='pcaps/test_dpi.pcap',
                        help='output file path (default: pcaps/test_dpi.pcap)')
    parser.add_argument('--count', type=int, default=500,
                        help='number of packets (default: 500)')
    parser.add_argument('--protocols', default='http,https,dns',
                        help='comma-separated protocols e.g. "http,https,dns,quic" (default: http,https,dns)')
    parser.add_argument('--domains', default='youtube.com,google.com,github.com,facebook.com',
                        help='comma-separated domain list (default: youtube.com,google.com,github.com,facebook.com)')
    parser.add_argument('--ip-range', default='192.168.1.0/24',
                        help='IP range string e.g. "192.168.1.0/24" (default: 192.168.1.0/24)')

    args = parser.parse_args()

    # Wire CLI args into existing variables
    output_path = args.output
    packet_count = args.count
    protocols = [p.strip() for p in args.protocols.split(',')]
    domain_list = [d.strip() for d in args.domains.split(',')]
    ip_range = args.ip_range

    # Ensure output directory exists
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    
    writer = PCAPWriter(output_path)
    
    # Source: User's machine
    user_mac = '00:11:22:33:44:55'
    user_ip = '192.168.1.100'
    
    # Destination: Various servers
    gateway_mac = 'aa:bb:cc:dd:ee:ff'
    
    packets_written = 0
    seq_base = 1000
    
    # Track statistics for the print summary
    stats = {'https': 0, 'http': 0, 'dns': 0, 'quic': 0, 'blocked': 0}

    # Generate packets until we reach the target count
    while packets_written < packet_count:
        # Choose a random protocol from enabled protocols
        proto = random.choice(protocols) if protocols else 'https'
        
        # Choose a random domain
        domain = random.choice(domain_list) if domain_list else 'example.com'
        
        # Generate random IP for destination
        dst_ip = f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        
        if proto == 'https' or proto == 'quic':
            # Generate 4 packets for a TLS connection
            if packets_written + 4 > packet_count:
                proto = 'dns' # Fallback to 1 packet if we don't have room
                continue
                
            src_port = random.randint(49152, 65535)
            
            # TCP SYN
            eth = create_ethernet_header(user_mac, gateway_mac)
            tcp = create_tcp_header(src_port, 443, seq_base, 0, 0x02)
            ip = create_ip_header(user_ip, dst_ip, 6, len(tcp))
            writer.write_packet(eth + ip + tcp)
            
            # TCP SYN-ACK
            tcp = create_tcp_header(443, src_port, seq_base + 1000, seq_base + 1, 0x12)
            ip = create_ip_header(dst_ip, user_ip, 6, len(tcp))
            eth = create_ethernet_header(gateway_mac, user_mac)
            writer.write_packet(eth + ip + tcp)
            
            # TCP ACK
            eth = create_ethernet_header(user_mac, gateway_mac)
            tcp = create_tcp_header(src_port, 443, seq_base + 1, seq_base + 1001, 0x10)
            ip = create_ip_header(user_ip, dst_ip, 6, len(tcp))
            writer.write_packet(eth + ip + tcp)
            
            # TLS Client Hello with SNI
            tls_data = create_tls_client_hello(domain)
            tcp = create_tcp_header(src_port, 443, seq_base + 1, seq_base + 1001, 0x18)
            ip = create_ip_header(user_ip, dst_ip, 6, len(tcp) + len(tls_data))
            writer.write_packet(eth + ip + tcp + tls_data)
            
            packets_written += 4
            seq_base += 10000
            stats[proto] += 1
            
        elif proto == 'http':
            # Generate 2 packets for HTTP
            if packets_written + 2 > packet_count:
                proto = 'dns' # Fallback to 1 packet
                continue
                
            src_port = random.randint(49152, 65535)
            
            # TCP SYN
            eth = create_ethernet_header(user_mac, gateway_mac)
            tcp = create_tcp_header(src_port, 80, seq_base, 0, 0x02)
            ip = create_ip_header(user_ip, dst_ip, 6, len(tcp))
            writer.write_packet(eth + ip + tcp)
            
            # HTTP request
            http_data = create_http_request(domain)
            tcp = create_tcp_header(src_port, 80, seq_base + 1, 1, 0x18)
            ip = create_ip_header(user_ip, dst_ip, 6, len(tcp) + len(http_data))
            writer.write_packet(eth + ip + tcp + http_data)
            
            packets_written += 2
            seq_base += 10000
            stats['http'] += 1
            
        elif proto == 'dns':
            # Generate 1 packet for DNS
            src_port = random.randint(49152, 65535)
            dns_data = create_dns_query(domain)
            eth = create_ethernet_header(user_mac, gateway_mac)
            udp = create_udp_header(src_port, 53, len(dns_data))
            ip = create_ip_header(user_ip, '8.8.8.8', 17, len(udp) + len(dns_data))
            writer.write_packet(eth + ip + udp + dns_data)
            
            packets_written += 1
            seq_base += 1000
            stats['dns'] += 1

    # Optional: ensure at least one blocked packet if it's over 100 packets
    if packet_count > 100 and packets_written == packet_count:
        pass # To keep exactly packet_count, we might just not add it, or we could replace the last few. Let's just keep exactly packet_count.

    writer.close()
    print(f"Created {output_path} with {packets_written} packets")
    print(f"  - {stats.get('https', 0) + stats.get('quic', 0)} TLS/QUIC connections (with SNI)")
    print(f"  - {stats.get('http', 0)} HTTP connections")
    print(f"  - {stats.get('dns', 0)} DNS queries")


if __name__ == '__main__':
    main()
