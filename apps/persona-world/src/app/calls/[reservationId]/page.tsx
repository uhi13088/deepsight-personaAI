"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Phone, PhoneOff, Mic, Loader2, Clock } from "lucide-react"
import { toast } from "sonner"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { PWProfileRing } from "@/components/persona-world"
import { ROLE_COLORS_BOLD } from "@/lib/role-config"
import type { CallReservation, CallTurnResponse } from "@/lib/types"

// ── 상수 ─────────────────────────────────────────────
const MAX_CALL_DURATION_SEC = 600 // 10분
const MAX_CALL_TURNS = 30

type CallPhase =
  | "loading"
  | "ready"
  | "greeting"
  | "idle"
  | "recording"
  | "processing"
  | "ended"
  | "error"

interface ConversationEntry {
  role: "user" | "persona"
  content: string
}

export default function InCallPage() {
  const params = useParams()
  const router = useRouter()
  const reservationId = params.reservationId as string
  const profile = useUserStore((s) => s.profile)

  // ── 통화 상태 ──
  const [phase, setPhase] = useState<CallPhase>("loading")
  const [reservation, setReservation] = useState<CallReservation | null>(null)
  const [callSessionId, setCallSessionId] = useState<string | null>(null)
  const [interactionSessionId, setInteractionSessionId] = useState<string | null>(null)
  const [turnNumber, setTurnNumber] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [lastPersonaText, setLastPersonaText] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [highlights, setHighlights] = useState<string[]>([])

  // ── 오디오 ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // ── 타이머 ──
  useEffect(() => {
    if (
      phase === "idle" ||
      phase === "recording" ||
      phase === "processing" ||
      phase === "greeting"
    ) {
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          if (prev + 1 >= MAX_CALL_DURATION_SEC) {
            handleEndCall()
            return prev + 1
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── 스크롤 ──
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation])

  // ── 예약 정보 로드 + 통화 시작 ──
  useEffect(() => {
    if (!profile?.id || !reservationId) return

    async function initCall() {
      try {
        // 1. 예약 정보 로드
        const reservations = await clientApi.getCallReservations(profile!.id)
        const r = reservations.find((rv) => rv.id === reservationId)
        if (!r) {
          setErrorMessage("예약을 찾을 수 없습니다")
          setPhase("error")
          return
        }
        if (r.status !== "PENDING" && r.status !== "CONFIRMED") {
          setErrorMessage("이미 처리된 예약입니다")
          setPhase("error")
          return
        }
        setReservation(r)
        setPhase("ready")

        // 2. 통화 시작
        const result = await clientApi.startCall(reservationId)
        setCallSessionId(result.callSessionId)
        setInteractionSessionId(result.interactionSessionId)

        // 3. 인사 재생
        setPhase("greeting")
        setLastPersonaText(result.greetingText)
        setConversation([{ role: "persona", content: result.greetingText }])

        // 4. 인사 오디오 재생
        await playAudio(result.greetingAudioBase64, result.greetingAudioContentType)

        setPhase("idle")
      } catch (err) {
        console.error("Failed to start call:", err)
        setErrorMessage("통화 시작에 실패했습니다")
        setPhase("error")
      }
    }

    initCall()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, reservationId])

  // ── 오디오 재생 ──
  const playAudio = useCallback(async (audioBase64: string, contentType: string) => {
    return new Promise<void>((resolve) => {
      const audio = new Audio(`data:${contentType};base64,${audioBase64}`)
      audioPlayerRef.current = audio
      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      audio.play().catch(() => resolve())
    })
  }, [])

  // ── 녹음 시작 ──
  const startRecording = useCallback(async () => {
    if (phase !== "idle") return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setPhase("recording")
    } catch {
      toast.error("마이크 접근 권한이 필요합니다")
    }
  }, [phase])

  // ── 녹음 중지 + 전송 ──
  const stopRecordingAndSend = useCallback(async () => {
    if (
      phase !== "recording" ||
      !mediaRecorderRef.current ||
      !callSessionId ||
      !reservation ||
      !profile?.id
    )
      return

    const mediaRecorder = mediaRecorderRef.current
    setPhase("processing")

    // 녹음 중지 후 데이터 수집
    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        resolve(blob)
      }
      mediaRecorder.stop()
      // 미디어 스트림 정리
      mediaRecorder.stream.getTracks().forEach((track) => track.stop())
    })

    // Base64 변환
    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    try {
      const result: CallTurnResponse = await clientApi.sendVoiceTurn({
        sessionId: callSessionId,
        reservationId: reservation.id,
        personaId: reservation.personaId,
        userId: profile.id,
        audioBase64: base64,
        audioContentType: "audio/webm",
        conversationHistory: conversation.map((c) => ({
          role: c.role,
          content: c.content,
        })),
        turnNumber,
        elapsedSec,
      })

      // 대화 기록 업데이트
      setConversation((prev) => [
        ...prev,
        { role: "user", content: result.userText },
        { role: "persona", content: result.personaText },
      ])
      setLastPersonaText(result.personaText)
      setTurnNumber(result.turnNumber)

      // 하이라이트 수집 (3턴마다)
      if (result.turnNumber % 3 === 0) {
        setHighlights((prev) => [...prev, result.personaText.slice(0, 100)])
      }

      // 페르소나 오디오 재생
      await playAudio(result.personaAudioBase64, result.personaAudioContentType)

      if (result.shouldEnd) {
        await handleEndCall()
      } else {
        setPhase("idle")
      }
    } catch (err) {
      console.error("Failed to process turn:", err)
      toast.error("응답 처리에 실패했습니다")
      setPhase("idle")
    }
  }, [
    phase,
    callSessionId,
    reservation,
    profile?.id,
    conversation,
    turnNumber,
    elapsedSec,
    playAudio,
  ])

  // ── 통화 종료 ──
  const handleEndCall = useCallback(async () => {
    if (!callSessionId || !reservation || !profile?.id) return
    if (phase === "ended") return

    setPhase("ended")

    // 진행 중인 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }

    // 타이머 중지
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      await clientApi.endCall({
        sessionId: callSessionId,
        reservationId: reservation.id,
        personaId: reservation.personaId,
        userId: profile.id,
        totalTurns: turnNumber,
        totalDurationSec: elapsedSec,
        highlights,
      })
      toast.success("통화가 종료되었습니다")
    } catch (err) {
      console.error("Failed to end call:", err)
    }
  }, [callSessionId, reservation, profile?.id, phase, turnNumber, elapsedSec, highlights])

  // ── 시간 포맷 ──
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const remainingSec = MAX_CALL_DURATION_SEC - elapsedSec
  const colorBold = ROLE_COLORS_BOLD["COMPANION"] || "from-violet-400 to-purple-500"

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">로그인이 필요합니다</p>
      </div>
    )
  }

  // ── 에러 화면 ──
  if (phase === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-4">
        <div className="rounded-full bg-red-500/20 p-6">
          <PhoneOff className="h-12 w-12 text-red-400" />
        </div>
        <p className="text-center text-lg text-white">{errorMessage}</p>
        <Link
          href="/calls"
          className="mt-4 rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          예약 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  // ── 종료 화면 ──
  if (phase === "ended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-4">
        <div className="rounded-full bg-green-500/20 p-6">
          <Phone className="h-12 w-12 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">통화 완료</h2>
        <div className="flex gap-6 text-sm text-gray-400">
          <span>총 {turnNumber}턴</span>
          <span>{formatTime(elapsedSec)}</span>
        </div>
        {lastPersonaText && (
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            &ldquo;{lastPersonaText.slice(0, 80)}...&rdquo;
          </p>
        )}
        <button
          onClick={() => router.push("/calls")}
          className="mt-6 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-8 py-3 text-sm font-medium text-white transition-all hover:shadow-lg"
        >
          돌아가기
        </button>
      </div>
    )
  }

  // ── 메인 통화 화면 ──
  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/5 bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button
            onClick={() => {
              if (phase !== "loading" && phase !== "ready") {
                handleEndCall()
              }
              router.push("/calls")
            }}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-white">
              {reservation?.personaName || "통화 중..."}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{formatTime(elapsedSec)}</span>
              <span className="text-gray-600">|</span>
              <span>남은 시간 {formatTime(remainingSec)}</span>
              <span className="text-gray-600">|</span>
              <span>
                턴 {turnNumber}/{MAX_CALL_TURNS}
              </span>
            </div>
          </div>
          <button
            onClick={handleEndCall}
            className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            종료
          </button>
        </div>
      </header>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* 페르소나 프로필 */}
          <div className="mb-8 flex flex-col items-center">
            <PWProfileRing size="lg">
              {reservation?.personaImageUrl ? (
                <img
                  src={reservation.personaImageUrl}
                  alt={reservation.personaName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-2xl text-white`}
                >
                  {reservation?.personaName?.charAt(0) || "?"}
                </div>
              )}
            </PWProfileRing>
            <h2 className="mt-3 text-lg font-semibold text-white">{reservation?.personaName}</h2>
            {(phase === "loading" || phase === "ready") && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>연결 중...</span>
              </div>
            )}
          </div>

          {/* 대화 로그 */}
          <div className="space-y-4">
            {conversation.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    entry.role === "user"
                      ? "rounded-tr-sm bg-violet-500/20 text-violet-200"
                      : "rounded-tl-sm bg-white/10 text-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                </div>
              </div>
            ))}

            {/* 처리 중 인디케이터 */}
            {phase === "processing" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={conversationEndRef} />
          </div>
        </div>
      </div>

      {/* 마이크 컨트롤 */}
      <div className="flex-shrink-0 border-t border-white/5 bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 py-6">
          {/* 상태 텍스트 */}
          <p className="text-xs text-gray-500">
            {phase === "greeting" && "인사를 듣고 있어요..."}
            {phase === "idle" && "마이크 버튼을 눌러 말하세요"}
            {phase === "recording" && "듣고 있어요... 다시 누르면 전송됩니다"}
            {phase === "processing" && "응답을 생성하고 있어요..."}
          </p>

          {/* 마이크 버튼 */}
          <button
            onClick={phase === "recording" ? stopRecordingAndSend : startRecording}
            disabled={phase !== "idle" && phase !== "recording"}
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
              phase === "recording"
                ? "animate-pulse bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600"
                : phase === "idle"
                  ? "bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/30 hover:shadow-xl"
                  : "bg-gray-700 opacity-50"
            }`}
          >
            {phase === "processing" ? (
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            ) : (
              <Mic className="h-7 w-7 text-white" />
            )}
          </button>

          {/* 진행 바 (남은 시간) */}
          <div className="w-full max-w-xs">
            <div className="h-1 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${(remainingSec / MAX_CALL_DURATION_SEC) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
