"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Users, UserRound, Building2 } from "@/components/icons"
import type { AgencyAgentRow, AgencyTreeNode } from "@/lib/db/agency"

interface AgentsHierarchyViewProps {
  hierarchyTree: AgencyTreeNode[]
  rootOrgId: string
  agents: AgencyAgentRow[]
  orgParam: string
}

function AgencyNode({
  node,
  agentsByOrg,
  rootOrgId,
  orgParam,
  onAgentClick,
  depth = 0,
}: {
  node: AgencyTreeNode
  agentsByOrg: Map<string, AgencyAgentRow[]>
  rootOrgId: string
  orgParam: string
  onAgentClick: (e: React.MouseEvent, agent: AgencyAgentRow) => void
  depth?: number
}) {
  const agencyAgents = agentsByOrg.get(node.id) ?? []
  const isRoot = node.id === rootOrgId

  return (
    <div className={depth > 0 ? "ml-6 mt-4" : ""}>
      <div
        className={`mb-3 flex items-center gap-3 rounded-xl px-4 py-3 ${
          isRoot
            ? "border border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30"
            : "border border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isRoot ? "bg-blue-100 dark:bg-blue-900/50" : "bg-primary/20 dark:bg-primary/20"
          }`}
        >
          {isRoot ? (
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <Building2 className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="font-medium">{node.name}</span>
        {!isRoot && (
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
            Agency
          </Badge>
        )}
      </div>
      <div className="ml-4 flex flex-col gap-4 border-l-2 border-muted pl-4">
        {agencyAgents.map((agent) => (
          <button
            key={agent.userId}
            onClick={(e) => onAgentClick(e, agent)}
            className="flex w-fit items-center gap-2 rounded-lg border border-green-200 bg-green-50/80 px-3 py-2 text-left transition-colors hover:bg-green-100/80 dark:border-green-900/50 dark:bg-green-950/30 dark:hover:bg-green-900/40"
          >
            <UserRound className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span className="font-medium">{agent.displayName}</span>
          </button>
        ))}
        {agencyAgents.length === 0 && node.children.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">No agents</p>
        )}
        {node.children.map((child) => (
          <AgencyNode
            key={child.id}
            node={child}
            agentsByOrg={agentsByOrg}
            rootOrgId={rootOrgId}
            orgParam={orgParam}
            onAgentClick={onAgentClick}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}

export function AgentsHierarchyView({
  hierarchyTree,
  rootOrgId,
  agents,
  orgParam,
}: AgentsHierarchyViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgencyAgentRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const agentsByOrg = useMemo(() => {
    const map = new Map<string, AgencyAgentRow[]>()
    for (const a of agents) {
      const list = map.get(a.organizationId) ?? []
      list.push(a)
      map.set(a.organizationId, list)
    }
    return map
  }, [agents])

  const handleAgentClick = (e: React.MouseEvent, agent: AgencyAgentRow) => {
    e.preventDefault()
    setSelectedAgent(agent)
    setSheetOpen(true)
  }

  if (hierarchyTree.length === 0) return null

  const rootNode = hierarchyTree[0]

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-6 pl-2">
            {/* Root org + nested hierarchy (agents displayed per agency in AgencyNode) */}
            <AgencyNode
              node={rootNode}
              agentsByOrg={agentsByOrg}
              rootOrgId={rootOrgId}
              orgParam={orgParam}
              onAgentClick={handleAgentClick}
            />
          </div>
        </div>
      </div>

      {/* Agent detail drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          {selectedAgent && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5" />
                  {selectedAgent.displayName}
                </SheetTitle>
                <SheetDescription>{selectedAgent.email}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Agency
                  </h4>
                  <p className="text-sm">{selectedAgent.organizationName}</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Role
                  </h4>
                  <p className="text-sm capitalize">
                    {selectedAgent.role.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                      Clients
                    </h4>
                    <p className="text-2xl font-semibold">
                      {selectedAgent.clientCount}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                      Policies
                    </h4>
                    <p className="text-2xl font-semibold">
                      {selectedAgent.policyCount}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Joined
                  </h4>
                  <p className="text-sm">
                    {selectedAgent.acceptedAt
                      ? new Date(selectedAgent.acceptedAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "—"}
                  </p>
                </div>
                <Link
                  href={`/agency/agents/${selectedAgent.userId}?${orgParam}`}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View full profile
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
