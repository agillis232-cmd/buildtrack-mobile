import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const tools: Anthropic.Tool[] = [
  {
    name: "create_note",
    description: "Create a note. Use when the user wants to save information, observations, reminders, or any text.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title" },
        content: { type: "string", description: "Note content" },
        category: { type: "string", enum: ["general", "meeting", "decision", "reminder", "idea"] },
      },
      required: ["content"]
    }
  },
  {
    name: "create_task",
    description: "Create a task or to-do item. Use when something needs to be done or work is assigned.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string" },
        assigneeName: { type: "string", description: "Name of person to assign to" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        dueDate: { type: "string", description: "Due date YYYY-MM-DD" },
        category: { type: "string", enum: ["general", "client", "permits", "materials", "inspection", "safety", "punch_list"] }
      },
      required: ["title"]
    }
  },
  {
    name: "create_event",
    description: "Create a calendar/schedule event. Use for meetings, inspections, deadlines, milestones.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: ["MILESTONE", "INSPECTION", "MEETING", "DEADLINE", "DELIVERY", "OTHER"] },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string" },
        notes: { type: "string" }
      },
      required: ["title", "startDate"]
    }
  },
  {
    name: "create_daily_log",
    description: "Create a daily log entry for a project.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string" },
        crew: { type: "string" },
        hoursWorked: { type: "number" },
        weather: { type: "string" },
        issues: { type: "string" },
        date: { type: "string" }
      },
      required: ["summary"]
    }
  },
  {
    name: "brain_dump",
    description: "Process a brain dump — extract action items from unstructured text.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["note", "task", "event"] },
              title: { type: "string" },
              content: { type: "string" },
              priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
              dueDate: { type: "string" },
              assigneeName: { type: "string" },
            },
            required: ["type", "title"]
          }
        }
      },
      required: ["items"]
    }
  }
]

async function executeToolCall(toolName: string, toolInput: any, projectId: string | null, orgId: string, userId: string): Promise<any> {
  switch (toolName) {
    case "create_note": {
      const note = await prisma.projectNote.create({
        data: {
          projectId: projectId || null,
          organizationId: orgId,
          createdById: userId,
          title: toolInput.title || null,
          content: toolInput.content,
          category: toolInput.category || "general",
        }
      })
      return { success: true, type: "note", id: note.id, title: toolInput.title || "Note created" }
    }
    case "create_task": {
      let assigneeId = null
      if (toolInput.assigneeName) {
        const assignee = await prisma.user.findFirst({
          where: { organizationId: orgId, name: { contains: toolInput.assigneeName, mode: "insensitive" } },
          select: { id: true, name: true }
        })
        assigneeId = assignee?.id || null
      }
      const task = await prisma.projectTask.create({
        data: {
          projectId: projectId || null,
          organizationId: orgId,
          createdById: userId,
          assigneeId,
          title: toolInput.title,
          description: toolInput.description || null,
          priority: toolInput.priority || "MEDIUM",
          dueDate: toolInput.dueDate ? new Date(toolInput.dueDate + "T12:00:00") : null,
          category: toolInput.category || "general",
        },
        include: { assignee: { select: { name: true } } }
      })
      return { success: true, type: "task", id: task.id, title: task.title, assignee: task.assignee?.name }
    }
    case "create_event": {
      if (!projectId) return { success: false, error: "Events require a project" }
      const event = await prisma.scheduleEvent.create({
        data: {
          projectId,
          createdBy: userId,
          title: toolInput.title,
          type: toolInput.type || "OTHER",
          date: new Date(toolInput.startDate + "T12:00:00"),
          startDate: new Date(toolInput.startDate + "T12:00:00"),
          endDate: toolInput.endDate ? new Date(toolInput.endDate + "T12:00:00") : null,
          notes: toolInput.notes || null,
        }
      })
      return { success: true, type: "event", id: event.id, title: event.title }
    }
    case "create_daily_log": {
      if (!projectId) return { success: false, error: "Daily logs require a project" }
      const log = await prisma.dailyLog.create({
        data: {
          projectId,
          date: toolInput.date ? new Date(toolInput.date + "T12:00:00") : new Date(new Date().toLocaleDateString("en-CA") + "T12:00:00"),
          summary: toolInput.summary,
          crew: toolInput.crew || "",
          hoursWorked: toolInput.hoursWorked || 0,
          weather: toolInput.weather || "",
          issues: toolInput.issues || null,
        }
      })
      return { success: true, type: "daily_log", id: log.id, summary: toolInput.summary }
    }
    case "brain_dump": {
      const results = []
      for (const item of toolInput.items) {
        try {
          if (item.type === "note") {
            results.push(await executeToolCall("create_note", { title: item.title, content: item.content || item.title }, projectId, orgId, userId))
          } else if (item.type === "task") {
            results.push(await executeToolCall("create_task", { title: item.title, description: item.content, priority: item.priority, dueDate: item.dueDate, assigneeName: item.assigneeName }, projectId, orgId, userId))
          } else if (item.type === "event" && projectId) {
            results.push(await executeToolCall("create_event", { title: item.title, startDate: item.dueDate || new Date().toLocaleDateString("en-CA"), notes: item.content }, projectId, orgId, userId))
          } else if (item.type === "event") {
            results.push(await executeToolCall("create_task", { title: item.title, description: item.content, priority: item.priority || "MEDIUM", dueDate: item.dueDate }, projectId, orgId, userId))
          }
        } catch (err) {
          results.push({ success: false, type: item.type, title: item.title, error: "Failed" })
        }
      }
      return { success: true, type: "brain_dump", items: results, count: results.length }
    }
    default:
      return { success: false, error: "Unknown tool" }
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = authHeader.split(" ")[1]
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const userId = payload.userId as string

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, organizationId: true, role: true }
    })
    if (!currentUser?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 })

    const { message, projectId, threadId } = await req.json()

    // Get or create thread
    let thread
    if (threadId) {
      thread = await prisma.assistantThread.findUnique({
        where: { id: threadId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } }
      })
    }
    if (!thread) {
      thread = await prisma.assistantThread.create({
        data: {
          projectId: projectId || null,
          organizationId: currentUser.organizationId,
          userId: currentUser.id,
          title: message.substring(0, 50),
        },
        include: { messages: [] as any }
      })
    }

    // Build project context
    let projectContext = ""
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          name: true, address: true, city: true, state: true, projectType: true,
          contractValue: true, completionPct: true, status: true, startDate: true, endDate: true,
        }
      })
      if (project) {
        projectContext = `\nProject: ${project.name} | ${project.address}, ${project.city} | ${project.projectType} | Budget: $${project.contractValue?.toLocaleString()} | ${project.completionPct}% complete`
      }
    }

    const team = await prisma.user.findMany({
      where: { organizationId: currentUser.organizationId, status: { in: ["ACTIVE", "APPROVED"] } },
      select: { name: true, role: true }
    })

    const systemPrompt = `You are BuildTrack Assistant — an AI executive assistant for construction project managers. Direct, efficient, construction-savvy. Keep responses brief.

Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
User: ${currentUser.name} (${currentUser.role})${projectContext}
Team: ${team.map(t => `${t.name} (${t.role})`).join(", ")}

Create notes, tasks, events, daily logs. For brain dumps, extract ALL action items. Be proactive — if someone mentions a deadline, create both a task AND event.`

    const conversationMessages: any[] = []
    if (thread.messages?.length > 0) {
      for (const msg of thread.messages.slice(-10)) {
        conversationMessages.push({ role: msg.role, content: msg.content })
      }
    }
    conversationMessages.push({ role: "user", content: message })

    await prisma.assistantMessage.create({
      data: { threadId: thread.id, role: "user", content: message }
    })

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages: conversationMessages,
    })

    const actions: any[] = []
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(b => b.type === "tool_use")
      const toolResults: any[] = []

      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(toolUse.name, toolUse.input, projectId || null, currentUser.organizationId, currentUser.id)
        actions.push(result)
        toolResults.push({ type: "tool_result" as const, tool_use_id: toolUse.id, content: JSON.stringify(result) })
      }

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages: [
          ...conversationMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults }
        ],
      })
    }

    const assistantText = response.content.filter(b => b.type === "text").map(b => b.text).join("\n")

    await prisma.assistantMessage.create({
      data: { threadId: thread.id, role: "assistant", content: assistantText, toolCalls: actions.length > 0 ? JSON.stringify(actions) : null }
    })

    return NextResponse.json({ message: assistantText, actions, threadId: thread.id })
  } catch (e: any) {
    console.error("Mobile assistant error:", e)
    return NextResponse.json({ error: typeof e === "string" ? e : e?.message || "Server error" }, { status: 500 })
  }
}