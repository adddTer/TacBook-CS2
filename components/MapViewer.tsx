import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';
import { MapId } from '../types';

interface MapViewerProps {
    mapId: MapId;
    className?: string;
}

const LAYER_MAPS: Record<string, boolean> = {
    'nuke': true,
    'vertigo': true,
};

export const MapViewer: React.FC<MapViewerProps> = ({ mapId, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [layer, setLayer] = useState<'upper' | 'lower'>('upper');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset layer when map changes
    useEffect(() => {
        setLayer('upper');
        setError(null);
    }, [mapId]);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 1000);
        camera.position.z = 10;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        containerRef.current.innerHTML = ''; // Clear previous canvas
        containerRef.current.appendChild(renderer.domElement);

        // Load Texture
        const loader = new DDSLoader();
        const mapName = mapId === 'dust2' ? 'de_dust2' : `de_${mapId}`; // Handle special cases if any, usually de_{mapId}
        const suffix = layer === 'lower' ? '_lower_radar' : '_radar';
        const url = `/maps/${mapName}${suffix}.dds`;

        setLoading(true);
        setError(null);

        loader.load(
            url,
            (texture) => {
                setLoading(false);
                texture.colorSpace = THREE.SRGBColorSpace;
                
                // Create Plane
                // We need to know the aspect ratio of the image to scale the plane correctly
                // DDSLoader returns a CompressedTexture which has image.width and image.height
                const texWidth = texture.image.width;
                const texHeight = texture.image.height;
                const aspect = texWidth / texHeight;

                // Fit to container
                let planeWidth = width;
                let planeHeight = width / aspect;

                if (planeHeight > height) {
                    planeHeight = height;
                    planeWidth = height * aspect;
                }

                const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
                const material = new THREE.MeshBasicMaterial({ map: texture });
                const plane = new THREE.Mesh(geometry, material);
                scene.add(plane);

                renderer.render(scene, camera);
            },
            undefined,
            (err) => {
                setLoading(false);
                console.error('Error loading DDS:', err);
                setError(`Failed to load map: ${url}`);
            }
        );

        // Handle Resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.left = -w / 2;
            camera.right = w / 2;
            camera.top = h / 2;
            camera.bottom = -h / 2;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            renderer.render(scene, camera);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            // texture.dispose() if we had reference
        };
    }, [mapId, layer]);

    const hasLowerLayer = LAYER_MAPS[mapId];

    return (
        <div className={`relative w-full h-full bg-neutral-900 rounded-xl overflow-hidden ${className}`}>
            <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
            
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                    Loading Map...
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-500 p-4 text-center">
                    {error}
                    <br />
                    <span className="text-xs text-neutral-400 mt-2 block">
                        Please ensure .dds files are in /public/maps/
                    </span>
                </div>
            )}

            {hasLowerLayer && (
                <div className="absolute bottom-4 right-4 flex gap-2 bg-black/60 p-1 rounded-lg backdrop-blur-sm">
                    <button
                        onClick={() => setLayer('upper')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            layer === 'upper' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-neutral-300 hover:bg-white/10'
                        }`}
                    >
                        Upper
                    </button>
                    <button
                        onClick={() => setLayer('lower')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            layer === 'lower' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-neutral-300 hover:bg-white/10'
                        }`}
                    >
                        Lower
                    </button>
                </div>
            )}
        </div>
    );
};
