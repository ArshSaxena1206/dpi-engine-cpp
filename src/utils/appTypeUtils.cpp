#include "appTypeUtils.h"

namespace DPI {

std::string appTypeToString(AppType type) {
    switch (type) {
        case AppType::UNKNOWN:    return "Unknown";
        case AppType::HTTP:       return "HTTP";
        case AppType::HTTPS:      return "HTTPS";
        case AppType::DNS:        return "DNS";
        case AppType::TLS:        return "TLS";
        case AppType::QUIC:       return "QUIC";
        case AppType::GOOGLE:     return "Google";
        case AppType::FACEBOOK:   return "Facebook";
        case AppType::YOUTUBE:    return "YouTube";
        case AppType::TWITTER:    return "Twitter/X";
        case AppType::INSTAGRAM:  return "Instagram";
        case AppType::NETFLIX:    return "Netflix";
        case AppType::AMAZON:     return "Amazon";
        case AppType::MICROSOFT:  return "Microsoft";
        case AppType::APPLE:      return "Apple";
        case AppType::WHATSAPP:   return "WhatsApp";
        case AppType::TELEGRAM:   return "Telegram";
        case AppType::TIKTOK:     return "TikTok";
        case AppType::SPOTIFY:    return "Spotify";
        case AppType::ZOOM:       return "Zoom";
        case AppType::DISCORD:    return "Discord";
        case AppType::GITHUB:     return "GitHub";
        case AppType::CLOUDFLARE: return "Cloudflare";
        case AppType::SLACK:      return "Slack";
        case AppType::REDDIT:     return "Reddit";
        case AppType::TWITCH:     return "Twitch";
        case AppType::LINKEDIN:   return "LinkedIn";
        case AppType::PINTEREST:  return "Pinterest";
        case AppType::SNAPCHAT:   return "Snapchat";
        case AppType::OPENAI:     return "OpenAI/ChatGPT";
        case AppType::STEAM:      return "Steam";
        case AppType::DROPBOX:    return "Dropbox";
        default:                  return "Unknown";
    }
}

} // namespace DPI
