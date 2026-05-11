import { createClient } from "@supabase/supabase-js";
import { sharedEnv } from "../config/shared-env.js";

const supabase = createClient(sharedEnv.supabaseUrl, sharedEnv.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const PASSWORD = "AtribeDemo123!";
const SUPPORTER_EMAIL = "sam.supporter+seed@atribe.app";
const CREATOR_EMAIL = "maya.creator+seed@atribe.app";
const CREATOR_NAME = "Maya Creator";

async function ensureUser(email) {
  const list = await supabase.auth.admin.listUsers();
  const existing = list.data.users.find((user) => user.email === email);
  if (existing) {
    return existing;
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (created.error) {
    throw created.error;
  }

  return created.data.user;
}

async function ensureProfile(user, displayName, preferredIntent) {
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name: displayName,
    preferred_intent: preferredIntent,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function ensureCreatorProfile(user) {
  const existing = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await supabase
    .from("creator_profiles")
    .insert({
      user_id: user.id,
      display_name: CREATOR_NAME,
      platform: "YouTube",
      niche: "Tech Reviews, AI, Gadgets",
      selected_niches: ["science_technology"],
      selected_sub_niches: { science_technology: ["Tech Reviews", "AI", "Gadgets"] },
      bio: "Seeded support-feature creator profile.",
      is_public: true,
    })
    .select("id")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data.id;
}

async function ensureMembership(supporterId, creatorId) {
  const { error } = await supabase.from("tribe_memberships").upsert({
    supporter_id: supporterId,
    creator_id: creatorId,
    weight: 100,
    selected: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function ensureAffiliateLink(creatorId) {
  const { error } = await supabase.from("shopify_creator_affiliate_links").upsert({
    creator_id: creatorId,
    domain: "amazon.in",
    affiliate_url: "https://www.amazon.in/?tag=maya-tech-20",
    is_active: true,
  });

  if (error) {
    // Keep seeding resilient if this table is not present in a given environment.
    console.warn("Skipping affiliate link seed:", error.message);
  }
}

async function ensureLowThresholdRewards(creatorId) {
  const rewards = [
    {
      title: "Early Deal Drops",
      description: "Get Maya's weekly product picks before everyone else.",
      reward_type: "early_access",
      required_points: 10,
      delivery_type: "external_url",
      destination_url: "https://example.com/maya-early-deal-drops",
    },
    {
      title: "Private Tribe Chat",
      description: "Join Maya's private supporter community.",
      reward_type: "shared_community",
      required_points: 25,
      delivery_type: "external_url",
      destination_url: "https://discord.gg/example",
    },
    {
      title: "Monthly Private AMA",
      description: "Join Maya's private monthly AMA.",
      reward_type: "private_ama",
      required_points: 50,
      delivery_type: "external_url",
      destination_url: "https://meet.google.com/example",
    },
  ];

  for (const reward of rewards) {
    const existing = await supabase
      .from("creator_rewards")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("title", reward.title)
      .maybeSingle();

    if (existing.error && existing.error.code !== "PGRST116") {
      throw existing.error;
    }

    if (existing.data?.id) {
      continue;
    }

    const { error } = await supabase.from("creator_rewards").insert({
      creator_id: creatorId,
      ...reward,
      is_active: true,
    });

    if (error) {
      throw error;
    }
  }
}

async function main() {
  const creatorUser = await ensureUser(CREATOR_EMAIL);
  const supporterUser = await ensureUser(SUPPORTER_EMAIL);

  await ensureProfile(creatorUser, CREATOR_NAME, "creator");
  await ensureProfile(supporterUser, "Sam Supporter", "supporter");

  const creatorId = await ensureCreatorProfile(creatorUser);

  await ensureMembership(supporterUser.id, creatorId);
  await ensureAffiliateLink(creatorId);
  await ensureLowThresholdRewards(creatorId);

  console.log(JSON.stringify({
    creator: {
      email: CREATOR_EMAIL,
      password: PASSWORD,
      creatorId,
    },
    supporter: {
      email: SUPPORTER_EMAIL,
      password: PASSWORD,
      supporterId: supporterUser.id,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
