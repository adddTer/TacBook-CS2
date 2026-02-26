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
                setError(`Failed to load map texture: ${mapName}${suffix}.dds`);
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm font-medium">Loading Map...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-6 text-center z-20">
                    <div className="max-w-md bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-2xl">
                        <div className="text-red-500 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold mb-2">Map Load Error</h3>
                        <p className="text-neutral-300 text-sm mb-4">{error}</p>
                        <div className="text-xs text-neutral-500 bg-neutral-900/50 p-3 rounded text-left font-mono">
                            Expected location: <br/>
                            /public/maps/{mapId === 'dust2' ? 'de_dust2' : `de_${mapId}`}{layer === 'lower' ? '_lower_radar' : '_radar'}.dds
                        </div>
                    </div>
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
