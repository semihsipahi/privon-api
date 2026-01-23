export class RevenueCatWebhookDto {
    api_version: string;
    event: RevenueCatEvent;
}

export class RevenueCatEvent {
    id: string;
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    expiration_at_ms: number;
    environment: string;
    store: string;
    subscriber_attributes?: Record<string, any>;
    [key: string]: any;
}
