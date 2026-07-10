"use client";

import { createContext, useContext } from "react";

export interface AppProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

const ProfileContext = createContext<AppProfile | null>(null);

export function ProfileProvider({
  profile,
  children,
}: {
  profile: AppProfile;
  children: React.ReactNode;
}) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile(): AppProfile {
  const profile = useContext(ProfileContext);
  if (!profile) {
    throw new Error("useProfile harus dipakai di dalam ProfileProvider");
  }
  return profile;
}
