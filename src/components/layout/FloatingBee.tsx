'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const FACTS: Record<string, { label: string; facts: string[] }> = {
  CSE: {
    label: 'CSE Fact',
    facts: [
      'The first computer bug was an actual moth found stuck in a relay of the Harvard Mark II in 1947.',
      'The first 1GB hard disk drive (1980) weighed about 550 lbs and cost $40,000.',
      'There are over 700 programming languages in existence today.',
      'The average programmer writes 10–12 lines of production code per day.',
      'Git was created by Linus Torvalds in just 10 days in 2005.',
      '"Hello, World!" was first used in a 1978 C programming book by Brian Kernighan.',
      'The first computer virus, Creeper, was created in 1971 as an experiment — it just displayed "I\'m the creeper, catch me if you can!"',
      'Python is named after Monty Python, not the snake.',
      'An estimated 90% of the world\'s data was generated in just the last two years.',
      'The first algorithm intended for a computer was written by Ada Lovelace in 1843.',
      'Binary code uses only 0s and 1s because transistors have two stable states: on and off.',
      'NASA still uses code written in the 1970s on some of its spacecraft.',
    ],
  },
  ICT: {
    label: 'ICT Fact',
    facts: [
      'The first commercial text message (SMS) was sent on December 3, 1992 — it said "Merry Christmas".',
      'The internet carries over 5 exabytes of data every day — that\'s 5 billion gigabytes.',
      'IPv4 has ~4.3 billion addresses. IPv6 has 340 undecillion — enough for every atom on Earth.',
      'Wi-Fi was accidentally invented — the underlying tech came from failed black hole detection research.',
      'The first webcam was used at Cambridge to monitor a coffee pot so researchers didn\'t waste trips.',
      'Fiber optic cables carry data as pulses of light, traveling at roughly 200,000 km/s.',
      'The "http" in web addresses stands for HyperText Transfer Protocol, invented by Tim Berners-Lee in 1989.',
      '5G can theoretically reach speeds of 20 Gbps — 100× faster than 4G LTE.',
      'The @ symbol was chosen for email by Ray Tomlinson in 1971 because it rarely appeared in names.',
      'Over 4 billion people actively use the internet today — more than half the world\'s population.',
      'Bluetooth is named after Harald Bluetooth, a 10th-century Danish king who united tribes.',
      'The first email ever sent was by Ray Tomlinson to himself in 1971. He doesn\'t remember what it said.',
    ],
  },
  CIE: {
    label: 'CIE Fact',
    facts: [
      'The first website ever created is still online at info.cern.ch — it went live on August 6, 1991.',
      'Google indexes over 130 trillion web pages, but that\'s only ~4% of the total internet.',
      'The average web page today is larger than the entire file size of Doom (1993).',
      'TCP/IP, the foundation of the internet, was designed to survive a nuclear attack.',
      'A DDoS attack in 2016 (Mirai botnet) knocked out Twitter, Netflix, and Reddit using IoT devices like webcams.',
      'Cloud computing was theorized by John McCarthy in 1961 — decades before it became real.',
      'The first domain name ever registered was Symbolics.com on March 15, 1985.',
      'There are more IoT devices on Earth than there are people — over 15 billion connected things.',
      'NAT (Network Address Translation) is why billions of devices can share just millions of public IPs.',
      'The "internet of things" term was coined by Kevin Ashton in 1999 during a presentation to Procter & Gamble.',
      'A single Google search uses more computing power than all of NASA used to send men to the Moon.',
      'The OSI model has 7 layers — engineers joke that the 8th layer is "the user".',
    ],
  },
  general: {
    label: 'Did you know?',
    facts: [
      'The Pomodoro Technique — 25 min focused work + 5 min break — can double your productivity.',
      'Studies show handwriting notes leads to better retention than typing.',
      'The "spacing effect" means reviewing material across multiple sessions beats cramming every time.',
      'Rubber duck debugging: explaining your code to an inanimate object actually helps you find bugs.',
      'The average person forgets 50% of new information within an hour without review.',
      'Sleep is when your brain consolidates memories — pulling an all-nighter before an exam backfires.',
      'The Feynman Technique: if you can\'t explain it simply, you don\'t understand it yet.',
      'Background music at ~65 dB enhances creative performance — complete silence can actually hurt it.',
      'Taking notes by hand activates more areas of the brain than typing.',
      'Interleaved practice (mixing topics) feels harder but produces better long-term results than blocking.',
    ],
  },
};

function getDepartmentFacts(pathname: string): { label: string; facts: string[] } {
  const parts = pathname.split('/').filter(Boolean);
  // URL pattern: /university/[department]/[batch]/[semester]/[subject]
  if (parts[0] === 'university' && parts[1]) {
    const dept = parts[1].toUpperCase();
    if (FACTS[dept]) return FACTS[dept];
  }
  return FACTS.general;
}

export default function FloatingBee() {
  const pathname = usePathname();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { label, facts } = getDepartmentFacts(pathname);

  // Reset fact index when department changes
  useEffect(() => {
    setFactIndex(0);
    setIsOpen(false);
  }, [pathname]);

  // Floating animation
  useEffect(() => {
    let animationFrame: number;
    let time = 0;
    const animate = () => {
      time += 0.02;
      setPosition({ x: Math.sin(time) * 10, y: Math.cos(time * 0.8) * 8 });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleBeeClick = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      // Cycle to next fact
      setFactIndex(i => (i + 1) % facts.length);
    }
  }, [isOpen, facts.length]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-8 right-8 z-50"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {/* Speech bubble */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-popover border border-border rounded-2xl shadow-xl p-4">
            <p className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
              💡 {label}
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {facts[factIndex]}
            </p>
            <p className="text-xs text-muted-foreground mt-3 text-right">
              {factIndex + 1} / {facts.length} · click bee for next
            </p>
          </div>
          {/* Tail pointing to bee */}
          <div className="absolute bottom-[-6px] right-7 w-3 h-3 bg-popover border-r border-b border-border rotate-45" />
        </div>
      )}

      {/* Bee button */}
      <button
        onClick={handleBeeClick}
        className="relative cursor-pointer focus:outline-none"
        aria-label="Fun fact from QBee"
      >
        <div className="w-16 h-16">
          <Image src="/bee_2.svg" alt="HiveNote Bee" width={64} height={64} className="w-full h-full transition-transform duration-200 hover:scale-110 active:scale-95" />
        </div>
        <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl -z-10 animate-pulse" />
      </button>
    </div>
  );
}
