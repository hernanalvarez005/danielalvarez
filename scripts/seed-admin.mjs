// Creates (or reuses) one organization and one admin user, so there is
// something to log in with after the initial migration is applied.
//
// Requires SUPABASE_SERVICE_ROLE_KEY, so run it with the service role env
// loaded and NEVER from a browser or client-side context:
//
//   node --env-file=.env.local scripts/seed-admin.mjs
//
// Optional env overrides: SEED_ORG_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local.",
  );
  process.exit(1);
}

const orgName = process.env.SEED_ORG_NAME ?? "Organización Demo";
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.local";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin-demo-2026";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  let { data: org, error: orgSelectError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", orgName)
    .maybeSingle();
  if (orgSelectError) throw orgSelectError;

  if (!org) {
    const { data: created, error: orgInsertError } = await supabase
      .from("organizations")
      .insert({ name: orgName })
      .select("id, name")
      .single();
    if (orgInsertError) throw orgInsertError;
    org = created;
    console.log(`Created organization "${org.name}" (${org.id})`);
  } else {
    console.log(`Reusing organization "${org.name}" (${org.id})`);
  }

  let user = await findUserByEmail(adminEmail);
  if (!user) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Administrador Demo" },
    });
    if (createError) throw createError;
    user = created.user;
    console.log(`Created auth user ${user.email} (${user.id})`);
  } else {
    console.log(`Reusing auth user ${user.email} (${user.id})`);
  }

  const { data: membership, error: membershipSelectError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipSelectError) throw membershipSelectError;

  if (!membership) {
    const { error: membershipInsertError } = await supabase
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: user.id, role: "admin", active: true });
    if (membershipInsertError) throw membershipInsertError;
    console.log("Created admin membership.");
  } else {
    console.log("Admin membership already exists.");
  }

  console.log("\nTest login:");
  console.log(`  email:    ${adminEmail}`);
  console.log(`  password: ${adminPassword}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
