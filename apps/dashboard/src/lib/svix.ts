import type { AppEvent } from 'src/types';

import { Svix, EndpointIn } from 'svix';

import env from './env';

const svixDisabled = !env.svix.apiKey || !env.teamFeatures.webhook;
const svix = !svixDisabled ? new Svix(env.svix.apiKey) : null;

export const findOrCreateApp = async (name: string, uid: string) => await svix?.application.getOrCreate({ name, uid });

export const createWebhook = async (appId: string, data: EndpointIn) => await svix?.endpoint.create(appId, data);

export const updateWebhook = async (appId: string, endpointId: string, data: EndpointIn) => await svix?.endpoint.update(appId, endpointId, data);

export const findWebhook = async (appId: string, endpointId: string) => await svix?.endpoint.get(appId, endpointId);

export const listWebhooks = async (appId: string) => await svix?.endpoint.list(appId);

export const deleteWebhook = async (appId: string, endpointId: string) => await svix?.endpoint.delete(appId, endpointId);

export const sendEvent = async (
  appId: string,
  eventType: AppEvent,
  payload: Record<string, unknown>
) => {
  await createEventType(eventType);
  return await svix?.message.create(appId, {
    eventType,
    payload: {
      event: eventType,
      data: payload,
    },
  });
};

export const createEventType = async (eventType: string) => {
  try {
    await svix?.eventType.create({
      name: eventType,
      description: `Event type for ${eventType}`,
    });
  } catch (e: any) {
    if (e.code !== 409) {
      throw e;
    }
  }
};
