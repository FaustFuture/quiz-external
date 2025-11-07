"use client"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export function ExampleComponent() {
  const [message, setMessage] = useState<string>("")

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .limit(1)
      
      if (error) {
        setMessage(`Supabase connection error: ${error.message}`)
      } else {
        setMessage("Supabase connection successful!")
      }
    } catch (err) {
      setMessage(`Error: ${err}`)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Example Component</h2>
      <p className="text-muted-foreground">
        This component demonstrates shadcn/ui Button component and Supabase integration.
      </p>
      
      <Button onClick={testSupabaseConnection}>
        Test Supabase Connection
      </Button>
      
      {message && (
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}
