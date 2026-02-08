"use client"

import { useParams } from "next/navigation"
import { PersonaNodeEditor } from "@/components/node-editor/persona-node-editor"

export default function PersonaDetailPage() {
  const params = useParams()
  const personaId = params?.id as string

  return <PersonaNodeEditor personaId={personaId} />
}
