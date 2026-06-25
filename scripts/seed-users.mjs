/**
 * Admin ve okutucu hesaplarını oluşturur.
 *
 * Önkoşul:
 * 1. supabase/setup.sql dosyasını Supabase SQL Editor'da çalıştırın
 * 2. .env.local içine SUPABASE_SERVICE_ROLE_KEY ekleyin
 *
 * Kullanım: npm run seed:users
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error(".env.local bulunamadı.");
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const USERS = [
  {
    email: "admin@ozmaksan.com",
    password: "OzmaksanAdmin1!",
    role: "admin",
    full_name: "Sistem Yöneticisi",
  },
  {
    email: "okutucu@ozmaksan.com",
    password: "OzmaksanOkutucu1!",
    role: "okutucu",
    full_name: "Saha Personeli",
  },
];

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local içinde tanımlı olmalı."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(user) {
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === user.email);

  if (existing) {
    await supabase.from("profiles").upsert({
      id: existing.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    });
    console.log(`✓ Mevcut kullanıcı güncellendi: ${user.email} (${user.role})`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      role: user.role,
      full_name: user.full_name,
    },
  });

  if (error) {
    console.error(`✗ ${user.email}: ${error.message}`);
    return;
  }

  console.log(`✓ Oluşturuldu: ${user.email} (${user.role}) — id: ${data.user?.id}`);
}

console.log("ÖZMAKSAN kullanıcı hesapları oluşturuluyor...\n");

for (const user of USERS) {
  await ensureUser(user);
}

console.log("\n--- Giriş bilgileri ---");
console.log("Admin:   admin@ozmaksan.com   / OzmaksanAdmin1!");
console.log("Okutucu: okutucu@ozmaksan.com / OzmaksanOkutucu1!");
