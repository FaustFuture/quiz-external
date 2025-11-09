"use client"

import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { RealtimeChannel } from "@supabase/supabase-js"

/**
 * PERFORMANCE OPTIMIZATION: Singleton realtime subscription manager
 * Prevents duplicate channel subscriptions and manages cleanup efficiently
 */

class RealtimeManager {
  private static instance: RealtimeManager
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptionCounts: Map<string, number> = new Map()

  private constructor() {}

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }

  /**
   * Subscribe to modules changes for a specific company
   * Returns an unsubscribe function
   */
  subscribeToModules(
    companyId: string,
    callback: (payload: any) => void
  ): () => void {
    const channelName = `modules-grid-${companyId}`
    
    // Increment subscription count
    const currentCount = this.subscriptionCounts.get(channelName) || 0
    this.subscriptionCounts.set(channelName, currentCount + 1)

    // If channel already exists, just add the callback
    let channel = this.channels.get(channelName)
    
    if (!channel) {
      console.log('[RealtimeManager] Creating new channel:', channelName)
      const supabase = createClientSupabaseClient()
      
      channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: true },
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'modules',
            filter: `company_id=eq.${companyId}`,
          },
          callback
        )
        .subscribe((status) => {
          console.log('[RealtimeManager] Subscription status:', status, 'for', channelName)
        })
      
      this.channels.set(channelName, channel)
    } else {
      console.log('[RealtimeManager] Reusing existing channel:', channelName)
      // Add the new callback to existing channel
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'modules',
          filter: `company_id=eq.${companyId}`,
        },
        callback
      )
    }

    // Return unsubscribe function
    return () => {
      const count = this.subscriptionCounts.get(channelName) || 0
      
      if (count <= 1) {
        // Last subscriber - remove channel
        console.log('[RealtimeManager] Removing channel:', channelName)
        const ch = this.channels.get(channelName)
        if (ch) {
          const supabase = createClientSupabaseClient()
          supabase.removeChannel(ch)
          this.channels.delete(channelName)
        }
        this.subscriptionCounts.delete(channelName)
      } else {
        // Decrement count
        this.subscriptionCounts.set(channelName, count - 1)
        console.log('[RealtimeManager] Decremented subscription count for:', channelName, 'to', count - 1)
      }
    }
  }

  /**
   * Get current subscription count for debugging
   */
  getSubscriptionCount(companyId: string): number {
    const channelName = `modules-grid-${companyId}`
    return this.subscriptionCounts.get(channelName) || 0
  }

  /**
   * Clean up all channels (useful for hot reload in development)
   */
  cleanup() {
    console.log('[RealtimeManager] Cleaning up all channels')
    const supabase = createClientSupabaseClient()
    
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    
    this.channels.clear()
    this.subscriptionCounts.clear()
  }
}

export const realtimeManager = RealtimeManager.getInstance()

