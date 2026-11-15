"use client";

/**
 * KSamplerPanel — панель «KSampler».
 * Seed (с рандомизацией), Steps, CFG, Sampler, Scheduler, Denoise.
 * Списки сэмплеров/шедулеров приходят из виджетов ноды KSampler живого
 * сервера (/object_info) — идентичны выпадающим спискам оригинального
 * интерфейса; офлайн — стандартный набор.
 */

import { useEffect, useState } from "react";
import { Dices } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationStore } from "@/store/touchme/useGenerationStore";
import {
  SAMPLERS,
  SCHEDULERS,
  fetchSamplerOptions,
} from "@/lib/touchme/data/sources";
import { PanelRow } from "./parts";

/** если текущее значение отсутствует в списке сервера — добавляем его сверху */
function ensureIncluded(list: string[], current: string): string[] {
  return list.includes(current) ? list : [current, ...list];
}

export default function KSamplerPanel() {
  const ksampler = useGenerationStore((s) => s.ksampler);
  const patchKSampler = useGenerationStore((s) => s.patchKSampler);
  const randomizeSeed = useGenerationStore((s) => s.randomizeSeed);

  const [samplers, setSamplers] = useState<string[]>(SAMPLERS);
  const [schedulers, setSchedulers] = useState<string[]>(SCHEDULERS);

  useEffect(() => {
    let cancelled = false;
    fetchSamplerOptions()
      .then((o) => {
        if (cancelled) return;
        setSamplers(o.samplers);
        setSchedulers(o.schedulers);
      })
      .catch(() => {
        /* офлайн — статические списки */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const samplerList = ensureIncluded(samplers, ksampler.sampler);
  const schedulerList = ensureIncluded(schedulers, ksampler.scheduler);

  return (
    <div className="flex flex-col gap-2.5">
      <PanelRow label="Seed" value={ksampler.seed}>
        <div className="flex items-center gap-2">
          <input
            value={ksampler.seed}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
              if (!Number.isNaN(v)) patchKSampler({ seed: v });
            }}
            inputMode="numeric"
            className="tm-allow-select tm-mono min-w-0 flex-1 border border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] py-2 text-center text-[13px] font-medium text-[var(--tm-violet)] outline-none focus:border-[var(--tm-violet)]"
            aria-label="Seed"
          />
          <button
            onClick={randomizeSeed}
            className="flex h-[38px] w-[38px] flex-none items-center justify-center border border-[var(--tm-border)] text-[var(--tm-text-dim)] active:text-[var(--tm-violet)]"
            aria-label="Случайный seed"
          >
            <Dices size={15} />
          </button>
        </div>
      </PanelRow>

      <PanelRow label="Steps" value={ksampler.steps}>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[ksampler.steps]}
          onValueChange={([v]) => patchKSampler({ steps: v })}
          aria-label="Steps"
        />
      </PanelRow>

      <PanelRow label="CFG" value={ksampler.cfg.toFixed(1)}>
        <Slider
          min={1}
          max={20}
          step={0.5}
          value={[ksampler.cfg]}
          onValueChange={([v]) => patchKSampler({ cfg: v })}
          aria-label="CFG"
        />
      </PanelRow>

      <PanelRow label="Sampler">
        <Select
          value={ksampler.sampler}
          onValueChange={(v) => patchKSampler({ sampler: v })}
        >
          <SelectTrigger className="tm-mono h-9 w-full border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] text-[11px] text-[var(--tm-text)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="tm-mono max-h-56 border-[var(--tm-border)] bg-[#141425] text-[11px] text-[var(--tm-text)]">
            {samplerList.map((s) => (
              <SelectItem key={s} value={s} className="text-[11px]">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PanelRow>

      <PanelRow label="Scheduler">
        <Select
          value={ksampler.scheduler}
          onValueChange={(v) => patchKSampler({ scheduler: v })}
        >
          <SelectTrigger className="tm-mono h-9 w-full border-[var(--tm-border)] bg-[rgba(15,15,28,0.7)] text-[11px] text-[var(--tm-text)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="tm-mono max-h-56 border-[var(--tm-border)] bg-[#141425] text-[11px] text-[var(--tm-text)]">
            {schedulerList.map((s) => (
              <SelectItem key={s} value={s} className="text-[11px]">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PanelRow>

      <PanelRow label="Denoise" value={ksampler.denoise.toFixed(2)}>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[ksampler.denoise]}
          onValueChange={([v]) => patchKSampler({ denoise: v })}
          aria-label="Denoise"
        />
      </PanelRow>
    </div>
  );
}
