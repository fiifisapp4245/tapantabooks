"use client"

/**
 * Portrait-led pages: the chairman's, MD's and finance director's statements
 * (MTN's layout — a big framed portrait, the title block beside it, two
 * columns of text below) and the board and management profile grids.
 */
import * as React from "react"
import type { Person, SectionData } from "@/lib/annual/types"
import { ArBody, ArTitle, Portrait, paginateText } from "../page"
import type { PageSpec, RenderCtx, SectionRenderer } from "../registry"
import { ContTitle, DISPLAY } from "./narrative-kit"

/* ---------------- statements ---------------- */

const CHAMFER = 56

function PortraitFrame({ name, photo }: { name: string; photo?: string }) {
  return (
    <div className="relative h-[430px] w-[300px] shrink-0">
      {/* The brand shape the portrait sits in. */}
      <div
        className="absolute bottom-0 left-0 top-12 w-[230px]"
        style={{ background: "var(--ar-primary)", clipPath: `polygon(0 0, 100% 0, 100% 100%, ${CHAMFER}px 100%, 0 calc(100% - ${CHAMFER}px))` }}
      />
      <div
        className="absolute left-6 right-0 top-0 bottom-6"
        style={{ clipPath: `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, 0 100%)` }}
      >
        <Portrait name={name} photo={photo} className="size-full [&>span]:text-[104px]" />
      </div>
    </div>
  )
}

function StatementFirst({ title, kicker, name, role, photo, text }: { title: string; kicker: string; name: string; role: string; photo?: string; text: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-end gap-8">
        <PortraitFrame name={name} photo={photo} />
        <div className="mb-6 min-w-0 flex-1 border-y border-[#D9D9D9] py-6">
          <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-[#6B6B6B] uppercase">{kicker}</p>
          <h2 className="text-[32px] leading-[1.08] font-semibold tracking-[-0.02em] text-[#1E1E1E]" style={DISPLAY}>
            {title}
          </h2>
          <span className="mt-5 mb-3 block h-1 w-10" style={{ background: "var(--ar-primary)" }} />
          <p className="text-[12px] font-semibold text-[#1E1E1E]">{name}</p>
          <p className="text-[10.5px] text-[#6B6B6B]">{role}</p>
        </div>
      </div>
      <div className="mt-8 min-h-0 flex-1 overflow-hidden">
        <ArBody text={text} columns={2} />
      </div>
    </div>
  )
}

function statement(): SectionRenderer {
  return (ctx) => {
    const d = ctx.section.data as SectionData["chairman"]
    const chunks = paginateText(d.body || " ", 2600, 5200)
    return chunks.map((text, i) => ({
      node:
        i === 0 ? (
          <StatementFirst title={ctx.section.title} kicker={ctx.section.part} name={d.name} role={d.role} photo={d.photo} text={text} />
        ) : (
          <div className="flex h-full flex-col">
            <ContTitle>{ctx.section.title} (continued)</ContTitle>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ArBody text={text} columns={2} />
            </div>
          </div>
        ),
    }))
  }
}

/* ---------------- profiles ---------------- */

const PER_PAGE = 6

function Profile({ p }: { p: Person }) {
  return (
    <div className="min-w-0">
      <div className="relative">
        <Portrait name={p.name} photo={p.photo} className="h-[168px] w-full [&>span]:text-[44px]" />
        <span className="absolute bottom-0 left-0 h-1 w-14" style={{ background: "var(--ar-primary)" }} />
      </div>
      <p className="mt-3 text-[13.5px] leading-tight font-semibold tracking-[-0.01em] text-[#1E1E1E]" style={DISPLAY}>
        {p.name}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold" style={{ color: "var(--ar-primary)" }}>
        {p.role}
      </p>
      {(p.appointed || p.qualifications) && (
        <dl className="mt-2 space-y-0.5 border-t border-[#E3E3E3] pt-2 text-[9.5px] leading-snug">
          {p.appointed && (
            <div className="flex gap-1.5">
              <dt className="shrink-0 text-[#6B6B6B]">Appointed</dt>
              <dd className="truncate text-[#2B2B2B]">{p.appointed}</dd>
            </div>
          )}
          {p.qualifications && (
            <div className="flex gap-1.5">
              <dt className="shrink-0 text-[#6B6B6B]">Qualifications</dt>
              <dd className="line-clamp-2 text-[#2B2B2B]">{p.qualifications}</dd>
            </div>
          )}
        </dl>
      )}
      {p.bio && <p className="mt-2 line-clamp-6 text-[10px] leading-[1.55] text-[#2B2B2B]">{p.bio}</p>}
    </div>
  )
}

function profiles(ctx: RenderCtx): PageSpec[] {
  const d = ctx.section.data as SectionData["board"]
  const people = d.people ?? []
  const pages: Person[][] = []
  for (let i = 0; i < people.length; i += PER_PAGE) pages.push(people.slice(i, i + PER_PAGE))
  if (!pages.length) pages.push([])
  return pages.map((group, i) => ({
    node: (
      <div className="flex h-full flex-col">
        {i === 0 ? (
          <>
            <ArTitle kicker={ctx.section.part} className="mb-4">
              {ctx.section.title}
            </ArTitle>
            {d.intro && <p className="mb-7 line-clamp-3 max-w-[520px] text-[12px] leading-[1.6] text-[#2B2B2B]">{d.intro}</p>}
          </>
        ) : (
          <ContTitle>{ctx.section.title} (continued)</ContTitle>
        )}
        <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-x-6 gap-y-8 overflow-hidden">
          {group.map((p) => (
            <Profile key={p.id} p={p} />
          ))}
        </div>
      </div>
    ),
  }))
}

export const PEOPLE: Record<"chairman" | "ceo" | "cfo" | "board" | "management", SectionRenderer> = {
  chairman: statement(),
  ceo: statement(),
  cfo: statement(),
  board: profiles,
  management: profiles,
}
