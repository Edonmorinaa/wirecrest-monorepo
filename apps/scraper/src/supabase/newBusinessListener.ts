import { SupabaseClient } from "@supabase/supabase-js";
import supabase from "./supabaseClient";

export function addSupabaseNewBusinessListener(client: SupabaseClient) {
    client.realtime.connect()
    const channelA = client
  .channel('schema-db-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
    },
    (payload) => console.log(payload)
  )
  .subscribe()

  console.log("SUBSCRIBED")
}