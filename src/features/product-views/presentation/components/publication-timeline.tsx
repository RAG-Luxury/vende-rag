import { Icon } from '@iconify/react';

import {
  PUBLICATION_TIMELINE_STEPS,
  resolvePublicationStepIndex,
} from '@/src/features/product-views/domain/publication-status';

interface PublicationTimelineProps {
  statusCode: number;
  isAuthenticated: boolean;
}

export function PublicationTimeline({
  statusCode,
  isAuthenticated: _isAuthenticated,
}: PublicationTimelineProps) {
  const activeIndex = resolvePublicationStepIndex(statusCode);

  return (
    <div className="flex items-start">
      {PUBLICATION_TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isPastOrActive = index <= activeIndex;
        const isFirst = index === 0;
        const isLast = index === PUBLICATION_TIMELINE_STEPS.length - 1;
        const leftLineFilled = !isFirst && index - 1 < activeIndex;
        const rightLineFilled = !isLast && isCompleted;

        return (
          <div key={step.label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={`h-0.5 flex-1 ${
                  isFirst ? 'bg-transparent' : leftLineFilled ? 'bg-brand' : 'bg-neutral-200'
                }`}
              />
              <span
                className={`flex size-3 shrink-0 items-center justify-center rounded-full ${
                  isPastOrActive ? 'bg-brand' : 'border-2 border-neutral-300 bg-white'
                }`}
              >
                {isCompleted ? <Icon icon="ion:checkmark" className="size-3.5 text-white" /> : null}
              </span>
              <span
                className={`h-0.5 flex-1 ${
                  isLast ? 'bg-transparent' : rightLineFilled ? 'bg-brand' : 'bg-neutral-200'
                }`}
              />
            </div>
            <span
              className={`mt-2 px-0.5 text-center text-[10px] leading-tight break-words ${
                isPastOrActive ? 'font-semibold text-neutral-900' : 'text-neutral-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
