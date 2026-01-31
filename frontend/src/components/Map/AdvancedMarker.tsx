import { useEffect, useRef } from "react";

interface AdvancedMarkerProps {
    map: google.maps.Map | null;
    position: { lat: number; lng: number };
    title?: string;
    label?: string;
    zIndex?: number;
    backgroundColor?: string;
}

/**
 * Google Maps의 새로운 AdvancedMarkerElement를 사용하는 커스텀 마커 컴포넌트
 */
export const AdvancedMarker = ({
    map,
    position,
    title,
    label,
    zIndex = 0,
    backgroundColor = "#EA4335"
}: AdvancedMarkerProps) => {
    const markerRef = useRef<any>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!map) {
            return;
        }

        // Check if AdvancedMarkerElement is available
        const AdvancedMarkerElement = (window.google?.maps?.marker as any)?.AdvancedMarkerElement;
        if (!AdvancedMarkerElement) {
            console.warn("AdvancedMarkerElement is not available. Make sure you're using Maps API v=beta and marker library is loaded.");
            return;
        }

        // Create marker content
        const content = document.createElement("div");
        content.className = "advanced-marker-content";
        content.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

        if (label) {
            // Numbered marker with label
            content.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background-color: ${backgroundColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          <span style="
            color: white;
            font-weight: bold;
            font-size: 16px;
            transform: rotate(45deg);
            user-select: none;
          ">${label}</span>
        </div>
      `;
        } else {
            // Simple colored marker (no label)
            content.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${backgroundColor};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
      `;
        }

        contentRef.current = content;

        // Create advanced marker
        const marker = new AdvancedMarkerElement({
            map,
            position,
            content,
            title,
            zIndex,
        });

        markerRef.current = marker;

        // Cleanup
        return () => {
            if (markerRef.current) {
                markerRef.current.map = null;
            }
        };
    }, [map, position.lat, position.lng, title, label, zIndex, backgroundColor]);

    // Update position when it changes
    useEffect(() => {
        if (markerRef.current && position) {
            markerRef.current.position = position;
        }
    }, [position]);

    return null;
};
