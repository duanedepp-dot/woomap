import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const previewReadOnly = import.meta.env.VITE_WOOMAP_PREVIEW_READ_ONLY === "true";

// Never initialize a Supabase client in public branch previews. Preview env vars
// intentionally use non-production placeholders until a dedicated staging project exists.
export const supabaseConfigured = Boolean(url && key && !previewReadOnly);
export const supabase = supabaseConfigured ? createClient(url!, key!) : null;
