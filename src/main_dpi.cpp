#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include "dpi_engine.h"

using namespace DPI;

void printUsage(const char* program) {
    std::cout << R"(
╔══════════════════════════════════════════════════════════════╗
║                    DPI ENGINE v1.0                            ║
║               Deep Packet Inspection System                   ║
╚══════════════════════════════════════════════════════════════╝

Usage: )" << program << R"( <input.pcap> <output.pcap> [options]

Arguments:
  input.pcap     Input PCAP file (captured user traffic)
  output.pcap    Output PCAP file (filtered traffic to internet)

Options:
  --block-ip <ip>        Block packets from source IP
  --block-app <app>      Block application (e.g., YouTube, Facebook)
  --block-domain <dom>   Block domain (supports wildcards: *.facebook.com)
  --rules <file>         Load blocking rules from file
  --lbs <n>              Number of load balancer threads (default: 2)
  --fps <n>              FP threads per LB (default: 2)
  --verbose              Enable verbose output

Examples:
  )" << program << R"( capture.pcap filtered.pcap
  )" << program << R"( capture.pcap filtered.pcap --block-app YouTube
  )" << program << R"( capture.pcap filtered.pcap --block-ip 192.168.1.50 --block-domain *.tiktok.com
  )" << program << R"( capture.pcap filtered.pcap --rules blocking_rules.txt

Supported Apps for Blocking:
  Google, YouTube, Facebook, Instagram, Twitter/X, Netflix, Amazon,
  Microsoft, Apple, WhatsApp, Telegram, TikTok, Spotify, Zoom, Discord, GitHub

Architecture:
  ┌─────────────┐
  │ PCAP Reader │  Reads packets from input file
  └──────┬──────┘
         │ hash(5-tuple) % num_lbs
         ▼
  ┌──────┴──────┐
  │ Load Balancer │  2 LB threads distribute to FPs
  │   LB0 │ LB1   │
  └──┬────┴────┬──┘
     │         │  hash(5-tuple) % fps_per_lb
     ▼         ▼
  ┌──┴──┐   ┌──┴──┐
  │FP0-1│   │FP2-3│  4 FP threads: DPI, classification, blocking
  └──┬──┘   └──┬──┘
     │         │
     ▼         ▼
  ┌──┴─────────┴──┐
  │ Output Writer │  Writes forwarded packets to output
  └───────────────┘

)";
}

std::vector<std::string> split(const std::string& s) {
    std::vector<std::string> tokens;
    std::istringstream iss(s);
    std::string token;
    while (iss >> token) {
        tokens.push_back(token);
    }
    return tokens;
}

struct AppArgs {
    std::string input_file;
    std::string output_file;
    DPIEngine::Config config;
    std::vector<std::string> block_ips;
    std::vector<std::string> block_apps;
    std::vector<std::string> block_domains;
    std::string rules_file;
    bool help_requested = false;
};

AppArgs parseArgs(int argc, char* argv[]) {
    AppArgs args;
    if (argc < 3) {
        args.help_requested = true;
        return args;
    }
    
    args.input_file = argv[1];
    args.output_file = argv[2];
    args.config.num_load_balancers = 2;
    args.config.fps_per_lb = 2;
    
    for (int i = 3; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--block-ip" && i + 1 < argc) {
            args.block_ips.push_back(argv[++i]);
        } else if (arg == "--block-app" && i + 1 < argc) {
            args.block_apps.push_back(argv[++i]);
        } else if (arg == "--block-domain" && i + 1 < argc) {
            args.block_domains.push_back(argv[++i]);
        } else if (arg == "--rules" && i + 1 < argc) {
            args.rules_file = argv[++i];
        } else if (arg == "--lbs" && i + 1 < argc) {
            args.config.num_load_balancers = std::stoi(argv[++i]);
        } else if (arg == "--fps" && i + 1 < argc) {
            args.config.fps_per_lb = std::stoi(argv[++i]);
        } else if (arg == "--verbose") {
            args.config.verbose = true;
        } else if (arg == "--help" || arg == "-h") {
            args.help_requested = true;
            return args;
        }
    }
    return args;
}

bool initEngine(DPIEngine& engine, const AppArgs& args) {
    if (!engine.initialize()) {
        std::cerr << "Failed to initialize DPI engine\n";
        return false;
    }
    
    if (!args.rules_file.empty()) engine.loadRules(args.rules_file);
    for (const auto& ip : args.block_ips) engine.blockIP(ip);
    for (const auto& app : args.block_apps) engine.blockApp(app);
    for (const auto& domain : args.block_domains) engine.blockDomain(domain);
    
    return true;
}

bool runPipeline(DPIEngine& engine, const AppArgs& args) {
    if (!engine.processFile(args.input_file, args.output_file)) {
        std::cerr << "Failed to process file\n";
        return false;
    }
    std::cout << "\nProcessing complete!\n";
    std::cout << "Output written to: " << args.output_file << "\n";
    return true;
}

int main(int argc, char* argv[]) {
    AppArgs args = parseArgs(argc, argv);
    if (args.help_requested) {
        printUsage(argv[0]);
        return args.input_file.empty() ? 1 : 0;
    }
    
    DPIEngine engine(args.config);
    if (!initEngine(engine, args)) return 1;
    if (!runPipeline(engine, args)) return 1;
    
    return 0;
}
