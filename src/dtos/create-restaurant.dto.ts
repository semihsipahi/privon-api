import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiPropertyOptional({ description: 'Restoran adresi' })
  @IsString({ message: 'Adres metin formatında olmalıdır' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'İl' })
  @IsString({ message: 'İl metin formatında olmalıdır' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'İlçe' })
  @IsString({ message: 'İlçe metin formatında olmalıdır' })
  @IsOptional()
  district?: string;

@ApiPropertyOptional({
    description: 'GeoJSON koordinatları [longitude, latitude]',
    example: [28.9784, 41.0082],
    type: [Number],
  })
  @IsArray({ message: 'Koordinatlar bir liste olmalıdır' })
  @IsNumber({}, { each: true, message: 'Koordinat listesi sadece sayı içermelidir' })
  @IsOptional()
  coordinates?: number[];
}

export class WorkingPeriodDto {
  @ApiPropertyOptional({ description: 'Açılış saati', example: '12:00' })
  @IsString({ message: 'Açılış saati metin formatında olmalıdır (ör: 12:00)' })
  @IsOptional()
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Kapanış saati', example: '16:00' })
  @IsString({ message: 'Kapanış saati metin formatında olmalıdır (ör: 16:00)' })
  @IsOptional()
  closingTime?: string;
}

export class WorkingHoursDto {
  @ApiPropertyOptional({ description: 'Gün ismi', example: 'Pazartesi' })
  @IsString({ message: 'Gün ismi metin formatında olmalıdır' })
  @IsOptional()
  dayName?: string;

  @ApiPropertyOptional({
    description: 'Çalışma periyotları',
    type: [WorkingPeriodDto],
  })
  @IsArray({ message: 'Periyotlar bir liste olmalıdır' })
  @ValidateNested({ each: true, message: 'Periyot listesi geçersiz formatta' })
  @Type(() => WorkingPeriodDto)
  @IsOptional()
  periods?: WorkingPeriodDto[];

  @ApiPropertyOptional({ description: 'Kapalı mı?', default: false })
  @IsBoolean({ message: 'Kapalı durumu true veya false olmalıdır' })
  @IsOptional()
  isClosed?: boolean;
}

export class CreateRestaurantDto {
  @ApiPropertyOptional({ description: 'Restoran sahibi (User ID)' })
  @IsMongoId({ message: 'Geçerli bir sahibi kullanıcı ID\'si giriniz' })
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ description: 'Restoran sahibi adı (Yeni kullanıcı oluşturmak için)' })
  @IsString({ message: 'Sahip adı metin formatında olmalıdır' })
  @IsOptional()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Restoran sahibi emaili (Yeni kullanıcı oluşturmak için)' })
  @IsString({ message: 'Sahip emaili metin formatında olmalıdır' })
  @IsOptional()
  ownerEmail?: string;

  @IsString({ message: 'Restoran ismi metin formatında olmalıdır' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Fiyat seviyesi (1: ₺, 2: ₺₺, 3: ₺₺₺, 4: ₺₺₺₺)' })
  @IsNumber({}, { message: 'Fiyat seviyesi sayı olmalıdır' })
  @IsOptional()
  priceLevel?: number;

  @ApiPropertyOptional({ description: 'Restoran resimleri (URL dizisi)' })
  @IsArray({ message: 'Resimler bir liste olmalıdır' })
  @IsString({ each: true, message: 'Her bir resim URL\'i metin olmalıdır' })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Restoran kategorileri ID listesi' })
  @IsMongoId({ each: true, message: 'Kategori ID\'leri geçerli formatta olmalıdır' })
  @IsArray({ message: 'Kategoriler bir liste olmalıdır' })
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({ description: 'Restoran konumu', type: LocationDto })
  @ValidateNested({ message: 'Konum bilgisi geçersiz formatta' })
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @ApiPropertyOptional({ description: 'Restoran açıklaması (Türkçe)' })
  @IsString({ message: 'Açıklama metin formatında olmalıdır' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Restoran açıklaması (İngilizce)' })
  @IsString({ message: 'İngilizce açıklama metin formatında olmalıdır' })
  @IsOptional()
  descriptionEng?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsString({ message: 'Website metin formatında olmalıdır' })
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Instagram profil URL' })
  @IsString({ message: 'Instagram URL metin formatında olmalıdır' })
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'Facebook profil URL' })
  @IsString({ message: 'Facebook URL metin formatında olmalıdır' })
  @IsOptional()
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'Telefon' })
  @IsString({ message: 'Telefon metin formatında olmalıdır' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'E-posta' })
  @IsString({ message: 'E-posta metin formatında olmalıdır' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Menü metni' })
  @IsString({ message: 'Menü metin formatında olmalıdır' })
  @IsOptional()
  menu?: string;

  @ApiPropertyOptional({ description: 'Kampanya koşulları metni' })
  @IsString({ message: 'Kampanya koşulları metin formatında olmalıdır' })
  @IsOptional()
  campaignTerms?: string;

  @ApiPropertyOptional({
    description: 'Çalışma saatleri',
    type: [WorkingHoursDto],
  })
  @IsArray({ message: 'Çalışma saatleri bir liste olmalıdır' })
  @ValidateNested({ each: true, message: 'Çalışma saatleri listesi geçersiz formatta' })
  @Type(() => WorkingHoursDto)
  @IsOptional()
  workingHours?: WorkingHoursDto[];

  @ApiPropertyOptional({ description: 'Feed videoları (URL dizisi)' })
  @IsArray({ message: 'Videolar bir liste olmalıdır' })
  @IsString({ each: true, message: 'Her bir video URL\'i metin olmalıdır' })
  @IsOptional()
  feedVideos?: string[];

  @ApiPropertyOptional({ description: 'Ödüller listesi (isim veya URL dizisi)' })
  @IsArray({ message: 'Ödüller bir liste olmalıdır' })
  @IsString({ each: true, message: 'Her bir ödül metin olmalıdır' })
  @IsOptional()
  awards?: string[];

  @ApiPropertyOptional({ description: 'Mutfak türleri (value listesi)', type: [String] })
  @IsArray({ message: 'Mutfak türleri liste olmalıdır' })
  @IsString({ each: true, message: 'Her mutfak türü metin olmalıdır' })
  @IsOptional()
  cuisineTypes?: string[];

  @ApiPropertyOptional({ description: 'Atmosfer türleri (value listesi)', type: [String] })
  @IsArray({ message: 'Atmosfer türleri liste olmalıdır' })
  @IsString({ each: true, message: 'Her atmosfer türü metin olmalıdır' })
  @IsOptional()
  atmosphereTypes?: string[];

  @ApiPropertyOptional({ description: 'Rezervem partner API mekan slug (rezervasyon entegrasyonu için)' })
  @IsString({ message: 'Rezervem slug metin formatında olmalıdır' })
  @IsOptional()
  rezervemSlug?: string;
}
