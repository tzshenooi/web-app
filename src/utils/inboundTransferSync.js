/** Merge booking rows by id (incoming wins on field conflicts). */
export function mergeBookings(prev, incoming) {
  const byId = new Map((prev || []).map((b) => [b.id, b]));
  for (const b of incoming || []) {
    byId.set(b.id, { ...byId.get(b.id), ...b });
  }
  return [...byId.values()];
}

/** Merge driver rows by id. */
export function mergeDrivers(prev, incoming) {
  const byId = new Map((prev || []).map((d) => [d.id, d]));
  for (const d of incoming || []) {
    byId.set(d.id, d);
  }
  return [...byId.values()];
}

/**
 * Notify receiving clinic portal instantly (Supabase postgres_changes UPDATE is
 * often missed when RLS did not allow SELECT on the old row).
 */
export async function broadcastInboundTransfer(supabaseClient, booking) {
  const destId = booking?.destination_clinic_id;
  if (!destId || !supabaseClient) return;

  const channelName = `clinic-inbound-${String(destId)}`;
  const channel = supabaseClient.channel(channelName);

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      supabaseClient.removeChannel(channel);
      resolve();
    }, 4000);

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      channel
        .send({
          type: 'broadcast',
          event: 'inbound_transfer',
          payload: { booking },
        })
        .finally(() => {
          clearTimeout(timeout);
          setTimeout(() => supabaseClient.removeChannel(channel), 400);
          resolve();
        });
    });
  });
}
