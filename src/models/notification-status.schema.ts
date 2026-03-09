import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class NotificationStatus extends Document {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Notification',
        required: true,
    })
    notificationId: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: MongooseSchema.Types.ObjectId;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    isClicked: boolean;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const NotificationStatusSchema =
    SchemaFactory.createForClass(NotificationStatus);

// Bileşik indeks kuralı: Her kullanıcı bir bildirim için tek bir duruma sahip olabilir
NotificationStatusSchema.index(
    { notificationId: 1, userId: 1 },
    { unique: true },
);
