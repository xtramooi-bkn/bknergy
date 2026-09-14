"use client";

import { useSyncExternalStore } from "react";

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

const subscribe = () => () => {};
const getBrowserGreeting = () => greetingForHour(new Date().getHours());
const getServerGreeting = () => "Hello";

export default function TimeAwareGreeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(subscribe, getBrowserGreeting, getServerGreeting);

  return <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{greeting}, {name}</h1>;
}