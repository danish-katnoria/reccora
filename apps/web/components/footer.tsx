import Link from 'next/link';
import { Logo } from './header';

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="font-display mt-4 text-xl text-white/90">Discover what creators love.</p>
          <p className="mt-3 max-w-sm text-sm text-white/60">Reccora is where creators share the products they genuinely recommend. Purchases are completed on the merchant’s own website, and Reccora may earn a commission on qualifying purchases.</p>
        </div>
        <div className="text-sm"><p className="mb-3 font-semibold text-white/90">Discover</p><ul className="space-y-2 text-white/60">
          <li><Link href="/explore" className="hover:text-white">Explore products</Link></li><li><Link href="/explore?tab=creators" className="hover:text-white">Find creators</Link></li><li><Link href="/saved" className="hover:text-white">Saved</Link></li></ul></div>
        <div className="text-sm"><p className="mb-3 font-semibold text-white/90">Creators</p><ul className="space-y-2 text-white/60">
          <li><Link href="/register?role=CREATOR" className="hover:text-white">Become a creator</Link></li><li><Link href="/creator" className="hover:text-white">Creator studio</Link></li></ul></div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} Reccora</div>
    </footer>
  );
}
