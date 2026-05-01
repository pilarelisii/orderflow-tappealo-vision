import { Loader2 } from "lucide-react";

const video = "/videos/llami.mov";

export default function FullScreenLoader() { 
    return (
			<div className="flex h-screen w-screen flex-col-reverse items-center justify-center bg-[#fffaf3] gap-3">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
				<video
					key={video}
					src={video}
					autoPlay
					loop
					muted
					playsInline
					className="w-44"
				/>
			</div>
		);
}

