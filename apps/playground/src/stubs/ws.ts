// vue-ink's devtools bridge imports `ws` for the Node-side WebSocket server.
// In the browser we never run the bridge — provide a class with the surface
// the import expects so module evaluation doesn't throw.
class WebSocketStub {
	on(): this {
		return this;
	}
	send(): void {}
	close(): void {}
	static Server = class {
		on(): unknown {
			return this;
		}
		close(): void {}
	};
}

export default WebSocketStub;
export { WebSocketStub as WebSocket };
