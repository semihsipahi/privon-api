import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

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

  @IsOptional()
  @IsNumber()
  event_timestamp_ms?: number;

  @IsOptional()
  @IsString()
  period_type?: string;

  @IsOptional()
  @IsNumber()
  purchased_at_ms?: number;

  @IsOptional()
  @IsString()
  entitlement_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entitlement_ids?: string[];

  @IsOptional()
  @IsString()
  presented_offering_id?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  original_transaction_id?: string;

  @IsOptional()
  @IsBoolean()
  is_family_share?: boolean;

  @IsOptional()
  @IsString()
  country_code?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  is_trial_conversion?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  price_in_purchased_currency?: number;

  @IsOptional()
  @IsNumber()
  takehome_percentage?: number;

  @IsOptional()
  @IsString()
  offer_code?: string;

  @IsOptional()
  @IsNumber()
  tax_percentage?: number;

  @IsOptional()
  @IsNumber()
  commission_percentage?: number;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsNumber()
  renewal_number?: number;

  @IsOptional()
  @IsString()
  app_id?: string;

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
