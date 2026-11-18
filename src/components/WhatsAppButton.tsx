import { MessageCircle } from 'lucide-react';
import { WHATSAPP_SUPPORT_URL } from '../lib/firebase';

export function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SaveSmart Support on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#10B981] text-[#101B35] font-semibold text-sm shadow-lg shadow-[#101B35]/15 hover:bg-[#0ea572] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101B35] whitespace-nowrap"
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline">WhatsApp Support</span>
    </a>
  );
}
