import { Truck } from 'lucide-react';
import { CSSProperties } from 'react';

interface RoadQueueCountdownProps {
    secondsRemaining: number;
    totalSeconds?: number;
    fetching?: boolean;
}

export default function RoadQueueCountdown({ secondsRemaining, totalSeconds = 60, fetching = false }: RoadQueueCountdownProps) {
    const progressPct = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;
    const roadDuration = fetching ? '1.2s' : '3s';

    return (
        <div className="relative mb-2 h-8 overflow-hidden rounded border border-gray-200 bg-gray-100 sm:h-10">
            <style>{`
                @keyframes road-queue-scroll { 0% { background-position-x: 0; } 100% { background-position-x: -80px; } }
                @keyframes road-queue-bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-3px) rotate(2deg); } }
                .road-queue-lane  { animation: road-queue-scroll var(--road-dur, 3s) linear infinite; }
                .road-queue-truck { animation: road-queue-bob 1.4s ease-in-out infinite; }
            `}</style>

            {/* Ambient scrolling lane-line texture - constant speed, independent of the countdown */}
            <div
                className="road-queue-lane absolute inset-x-0 bottom-2 h-1"
                style={
                    {
                        '--road-dur': roadDuration,
                        backgroundImage: 'repeating-linear-gradient(90deg, #cbd5e1 0 20px, transparent 20px 40px)',
                    } as CSSProperties
                }
            />

            {/* Truck - its position is the countdown-driven part */}
            <div
                className="road-queue-truck absolute top-1.5 text-gray-700"
                style={{ left: `calc(${progressPct}% - 16px)`, transition: 'left 1s linear' }}
            >
                <Truck className="size-6" strokeWidth={2} />
            </div>

            {/* Thin progress accent */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-200">
                <div className="h-full bg-blue-500" style={{ width: `${progressPct}%`, transition: 'width 1s linear' }} />
            </div>
        </div>
    );
}
