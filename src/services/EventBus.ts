export interface EventBusCallback<T = any> {
  (data: T): void;
}

export const EventBus = {
    on<T = any>(event: string, callback: EventBusCallback<T>): void {
        document.addEventListener(event, (e) => {
            const customEvent = e as CustomEvent<T>;
            callback(customEvent.detail);
        });
    },
    dispatch<T = any>(event: string, data: T): void {
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    },
    remove<T = any>(event: string, callback: EventBusCallback<T>): void {
        document.removeEventListener(event, callback as EventListener);
    },
};
