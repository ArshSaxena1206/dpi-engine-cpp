import { HelpCircle, Book, MessageCircle, FileText, ExternalLink, Search } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    { q: "How do I upload a PCAP file?", a: "Navigate to the Upload page and drag and drop your .pcap or .pcapng file into the designated area. The processing will start automatically." },
    { q: "What does 'Dropped' mean in stats?", a: "Dropped packets are those that matched a blocking rule (IP, Domain, or Application) and were filtered out by the DPI engine." },
    { q: "Can I add custom blocking rules?", a: "Yes, go to the Rules tab to add specific IP addresses, Domains, or Applications to block in future processing." },
    { q: "Where are the logs stored?", a: "Logs are temporarily stored in the SQLite database and are available for download in CSV format from the Dashboard or Logs page." }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-display text-on-surface">How can we help?</h2>
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input
            type="text"
            placeholder="Search documentation..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <Book className="w-8 h-8 text-[#0052CC] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-on-surface mb-2">Documentation</h3>
          <p className="text-sm text-on-surface-variant mb-4">Detailed guides on using the DPI engine and configuring rules.</p>
          <span className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wider">Read Docs <ExternalLink className="w-3 h-3" /></span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <FileText className="w-8 h-8 text-[#36B37E] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-on-surface mb-2">API Reference</h3>
          <p className="text-sm text-on-surface-variant mb-4">Integrate the DPI engine into your own apps using our REST API.</p>
          <span className="text-xs font-bold text-[#006644] flex items-center gap-1 uppercase tracking-wider">View API <ExternalLink className="w-3 h-3" /></span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <MessageCircle className="w-8 h-8 text-[#FF8B00] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-on-surface mb-2">Community Support</h3>
          <p className="text-sm text-on-surface-variant mb-4">Join our forum to ask questions and share your configurations.</p>
          <span className="text-xs font-bold text-[#FF8B00] flex items-center gap-1 uppercase tracking-wider">Get Help <ExternalLink className="w-3 h-3" /></span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-8">
        <h3 className="text-xl font-bold font-display text-on-surface mb-6">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((faq, i) => (
            <div key={i}>
              <h4 className="font-bold text-on-surface mb-2 flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {faq.q}
              </h4>
              <p className="text-sm text-on-surface-variant pl-4 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
