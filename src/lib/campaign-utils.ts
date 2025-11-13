import { Campaign, CampaignStatus } from "./campaign-storage";

export interface CampaignFormData {
  name: string;
  instanceId: string;
  contactListId: string;
  messageText: string;
  mediaUrl?: string;
  mediaCaption?: string;
  linkPreview: boolean;
  mentionsEveryOne: boolean;
  scheduledAt?: string;
  minDelay: number;
  maxDelay: number;
}

export const mapCampaignToFormData = (campaign: Campaign): CampaignFormData => ({
  name: campaign.name,
  instanceId: campaign.instance_id,
  contactListId: campaign.contact_list_id,
  messageText: campaign.message_text,
  mediaUrl: campaign.media_url,
  mediaCaption: campaign.media_caption,
  linkPreview: campaign.link_preview,
  mentionsEveryOne: campaign.mentions_every_one,
  scheduledAt: campaign.scheduled_at,
  minDelay: campaign.min_delay,
  maxDelay: campaign.max_delay,
});