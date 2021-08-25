import { AccessType, ExtraInstruction, MainAccessRequest, MainAccessResponse } from '../types';
import { deserializeValue, serializeValue } from './main-serialization';
import { getInstance, getInstanceId } from './main-instances';
import { isPromise, PT_SCRIPT_INIT_TYPE } from '../utils';

export const mainAccessHandler = async (accessReq: MainAccessRequest) => {
  const accessType = accessReq.$accessType$;
  const instanceId = accessReq.$instanceId$;
  const memberPath = accessReq.$memberPath$!;
  const data = accessReq.$data$;
  const extraInstructions = accessReq.$extraInstructions$;
  const accessRsp: MainAccessResponse = {
    $msgId$: accessReq.$msgId$,
    $instanceId$: instanceId,
  };

  try {
    const instance = getInstance(instanceId);
    if (instance) {
      if (accessType === AccessType.Get) {
        await getInstanceMember(accessRsp, instance, memberPath);
      } else if (accessType === AccessType.CallMethod) {
        await callInstanceMethod(accessRsp, instance, memberPath, data, extraInstructions);
      } else if (accessType === AccessType.Set) {
        instance[memberPath[memberPath.length - 1]] = deserializeValue(data);
      }
    } else {
      accessRsp.$error$ = `Instance ${instanceId} not found`;
    }
  } catch (e) {
    accessRsp.$error$ = String(e.stack || e);
  }

  return accessRsp;
};

const getInstanceMember = async (
  accessRsp: MainAccessResponse,
  instance: any,
  memberPath: string[]
) => {
  let memberName = memberPath[0];
  let getterValue: any = instance[memberName];

  for (let i = 1; i < memberPath.length; i++) {
    memberName = memberPath[i];
    getterValue = getterValue[memberName];
  }

  if (isPromise(getterValue)) {
    getterValue = await getterValue;
    accessRsp.$isPromise$ = true;
  }
  accessRsp.$rtnValue$ = serializeValue(getterValue, new Set());
};

const callInstanceMethod = async (
  accessRsp: MainAccessResponse,
  instance: any,
  memberPath: string[],
  serializedArgs: any[],
  extraInstructions?: ExtraInstruction[]
) => {
  const args = deserializeValue(serializedArgs);
  const memberPathLength = memberPath.length;
  let rtnValue: any = undefined;

  if (memberPathLength === 1) {
    rtnValue = instance[memberPath[0]].apply(instance, args);
  } else if (memberPathLength === 2) {
    rtnValue = instance[memberPath[0]][memberPath[1]].apply(instance[memberPath[0]], args);
  }

  if (isPromise(rtnValue)) {
    rtnValue = await rtnValue;
    accessRsp.$isPromise$ = true;
  }

  accessRsp.$rtnValue$ = serializeValue(rtnValue, new Set());

  if (extraInstructions) {
    extraInstructions.forEach((extra) => {
      if (extra === ExtraInstruction.SET_INERT_IMG) {
        (rtnValue as HTMLImageElement).hidden = true;
      }
      if (extra === ExtraInstruction.SET_INERT_SCRIPT) {
        (rtnValue as HTMLScriptElement).type = PT_SCRIPT_INIT_TYPE;
      }
      if (extra === ExtraInstruction.SET_PARTYTOWN_ID) {
        rtnValue.dataset.partytownId = getInstanceId(rtnValue);
      }
    });
  }
};
