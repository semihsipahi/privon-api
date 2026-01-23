import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class RevenueCatEvent {
    @IsString()
    id: string;

    @IsString()
    type: string;

    @IsString()
    app_user_id: string;

    @IsString()
    original_app_user_id: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aliases?: string[];

    @IsString()
    product_id: string;

    @IsNumber()
    @IsOptional()
    expiration_at_ms: number;

    @IsString()
    environment: string;

    @IsString()
    store: string;

    @IsOptional()
    subscriber_attributes?: Record<string, any>;

    [key: string]: any;
}

export class RevenueCatWebhookDto {
    @IsString()
    api_version: string;

    @ValidateNested()
    @Type(() => RevenueCatEvent)
    event: RevenueCatEvent;
}
