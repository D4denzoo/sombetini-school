'use client';

import { motion, useInView, useMotionValue, useSpring, type Variants } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

const easing = [0.22, 1, 0.36, 1] as const;

/** Snappy enough that page swaps feel responsive; still soft enough to feel polished. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easing } },
};

export function Reveal({ children, delay = 0, className, as = 'div', id }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'article' | 'li'; id?: string }) {
  const Comp = motion[as];
  return (
    <Comp
      id={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px', amount: 0.15 }}
      transition={{ duration: 0.35, ease: easing, delay: Math.min(delay, 0.15) }}
      className={className}
    >
      {children}
    </Comp>
  );
}

export function Stagger({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px', amount: 0.12 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function CountUp({ value, suffix = '', className, duration = 1.1 }: { value: number; suffix?: string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = `${Math.round(latest).toLocaleString()}${suffix}`;
    });
  }, [spring, suffix]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}

export { motion };
