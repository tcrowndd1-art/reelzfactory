// ============================================================
// C:\Dev\reelzfactory\apps\web\app\create\[id]\page.tsx
// Pipeline Orchestrator — 훅 조합 + 오토파일럿 통합
// ============================================================

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import type { Step } from "@/types/pipeline";

// Hooks
import { useProjectLoader } from "@/hooks/pipeline/useProjectLoader";
import { useScriptGeneration } from "@/hooks/pipeline/useScriptGeneration";
import { useVoiceGeneration } from "@/hooks/pipeline/useVoiceGeneration";
import { useImageGeneration } from "@/hooks/pipeline/useImageGeneration";
import { useRenderPipeline } from "@/hooks/pipeline/useRenderPipeline";
import { useYoutubeUpload } from "@/hooks/pipeline/useYoutubeUpload";
import { useAutopilot } from "@/hooks/pipeline/useAutopilot";

// Components
import { PipelineSteps } from "@/components/pipeline/PipelineSteps";
import { ScriptStep } from "@/components/pipeline/ScriptStep";
import { VoiceStep } from "@/components/pipeline/VoiceStep";
import { VoiceSettingsModal } from "@/components/pipeline/VoiceSettingsModal";
import { StoryboardStep } from "@/components/pipeline/StoryboardStep";
import { RenderStep } from "@/components/pipeline/RenderStep";
import { UploadStep } from "@/components/pipeline/UploadStep";
import { AutopilotBar } from "@/components/pipeline/AutopilotBar";

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // ===== 1. 프로젝트 로드 =====
  const {
    project, setProject,
    script, setScript,
    currentStep, setCurrentStep,
    stepStatus, setStepStatus,
    isLoading,
  } = useProjectLoader(id);

  // ===== 2. 대본 생성 =====
  const {
    isGenerating: isScriptGenerating,
    streamText, streamRef,
    generateScript, confirmScript,
  } = useScriptGeneration({
    project, script, setScript, setProject, setCurrentStep, setStepStatus,
  });

  // ===== 3. 음성 생성 =====
  const voice = useVoiceGeneration({
    project, script, setScript,
  });

  // ===== 4. 이미지 생성 =====
  const image = useImageGeneration({
    project, script, setScript,
  });

  // ===== 5. 렌더링 =====
  const render = useRenderPipeline({
    project, script, setStepStatus,
  });

  // ===== 6. 업로드 =====
  const upload = useYoutubeUpload({
    project, script,
  });

  // ===== 7. 오토파일럿 =====
  const autopilot = useAutopilot({
    project,
    script,
    setCurrentStep,
    setStepStatus,
    generateVoices: voice.generateVoices,
    generateAllImages: image.generateAllImages,
    prepareRender: render.prepareRender,
    startRender: render.startRender,
    voiceIsGenerating: voice.isGenerating,
    imageIsGenerating: image.isGenerating,
  });

  // ===== 로딩/에러 상태 =====
  if (isLoading) {
    return <div style={{ padding: 32, color: "#64748b" }}>Loading...</div>;
  }

  if (!project) {
    return <div style={{ padding: 32, color: "#64748b" }}>Project not found</div>;
  }

  // ===== 탭 전환 핸들러 =====
  const handleStepClick = (step: Step) => {
    if (!autopilot.isRunning) {
      setCurrentStep(step);
    }
  };

  const moveToStoryboard = () => {
    setCurrentStep("storyboard");
    setStepStatus((s) => ({ ...s, tts: "done" }));
  };

  const moveToRender = () => {
    setCurrentStep("render");
    setStepStatus((s) => ({ ...s, storyboard: "done" }));
  };

  const moveToUpload = () => {
    setCurrentStep("upload");
    setStepStatus((s) => ({ ...s, render: "done" }));
  };

  // 오토파일럿 시작 가능 조건: 대본 확정 + 실행 중 아님
  const canStartAutopilot = !!script && stepStatus.script === "done" && !autopilot.isRunning;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }} className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <button onClick={() => router.push("/projects")} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 13,
            cursor: "pointer", marginBottom: 8, padding: 0,
          }}>← Back to Projects</button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
            {project.title || project.topic}
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {project.mode === "longform" ? "Long-form" : "Shorts"} · {project.source}
          </p>
        </div>
      </div>

      {/* Autopilot Bar */}
      {stepStatus.script === "done" && (
        <AutopilotBar
          isRunning={autopilot.isRunning}
          phase={autopilot.progress.phase}
          message={autopilot.progress.message}
          completedSteps={autopilot.progress.completedSteps}
          totalSteps={autopilot.progress.totalSteps}
          errors={autopilot.progress.errors}
          onStart={autopilot.startAutopilot}
          onStop={autopilot.stopAutopilot}
          canStart={canStartAutopilot}
        />
      )}

      {/* Pipeline Steps */}
      <PipelineSteps
        currentStep={currentStep}
        stepStatus={stepStatus}
        onStepClick={handleStepClick}
      />

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        showVoiceModal={voice.showVoiceModal}
        setShowVoiceModal={voice.setShowVoiceModal}
        voiceStyle={voice.voiceStyle}
        setVoiceStyle={voice.setVoiceStyle}
        voiceGender={voice.voiceGender}
        setVoiceGender={voice.setVoiceGender}
        voiceSpeed={voice.voiceSpeed}
        setVoiceSpeed={voice.setVoiceSpeed}
        selectedVoiceName={voice.selectedVoiceName}
        setSelectedVoiceName={voice.setSelectedVoiceName}
        voiceTab={voice.voiceTab}
        setVoiceTab={voice.setVoiceTab}
        activeVoiceName={voice.getActiveVoiceName()}
        categoryVoices={voice.getCategoryVoices()}
        categoryLabel={project.category || "health"}
        voiceEngine={voice.voiceEngine}
        setVoiceEngine={voice.setVoiceEngine}
        onGenerate={voice.generateVoices}
      />

      {/* Step Content */}
      {currentStep === "script" && (
        <ScriptStep
          script={script}
          setScript={setScript}
          isGenerating={isScriptGenerating}
          streamText={streamText}
          streamRef={streamRef}
          onGenerate={generateScript}
          onConfirm={confirmScript}
        />
      )}

      {currentStep === "tts" && script && (
        <VoiceStep
          script={script}
          isGenerating={voice.isGenerating}
          voiceProgress={voice.voiceProgress}
          voiceErrors={voice.voiceErrors}
          activeVoiceName={voice.getActiveVoiceName()}
          voiceEngine={voice.voiceEngine}
          voiceStyle={voice.voiceStyle}
          voiceGender={voice.voiceGender}
          voiceSpeed={voice.voiceSpeed}
          onOpenModal={() => voice.setShowVoiceModal(true)}
          onMoveToStoryboard={moveToStoryboard}
        />
      )}

      {currentStep === "storyboard" && script && (
        <StoryboardStep
          script={script}
          isGenerating={image.isGenerating}
          imageProgress={image.imageProgress}
          imageErrors={image.imageErrors}
          onGenerateAll={image.generateAllImages}
          onRegenerateScene={image.regenerateSceneImage}
          onMoveToRender={moveToRender}
        />
      )}

      {currentStep === "render" && script && (
        <RenderStep
          script={script}
          renderData={render.renderData}
          prepareStatus={render.prepareStatus}
          renderVideoStatus={render.renderVideoStatus}
          onPrepare={render.prepareRender}
          onRender={render.startRender}
          onMoveToUpload={moveToUpload}
        />
      )}

      {currentStep === "upload" && script && (
        <UploadStep
          script={script}
          uploadStatus={upload.uploadStatus}
          uploadedUrl={upload.uploadedUrl}
          onUpload={upload.uploadToYoutube}
        />
      )}
    </div>
  );
}