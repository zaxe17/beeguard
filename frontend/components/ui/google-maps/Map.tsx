import React from "react";

const Map = () => {
	return (
		<div className="w-full h-full overflow-hidden">
			<iframe
				src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19540.905696663343!2d121.02859267520665!3d14.659800993250323!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b710db7cef5b%3A0x3e13b4b353f13f2e!2sBureau%20Of%20Animal%20Industry!5e1!3m2!1sen!2sph!4v1782965343838!5m2!1sen!2sph"
				width="100%"
				height="100%"
				className="w-full h-full"
				style={{ border: 0 }}
				allowFullScreen
				loading="lazy"
				referrerPolicy="strict-origin-when-cross-origin"></iframe>
		</div>
	);
};

export default Map;
