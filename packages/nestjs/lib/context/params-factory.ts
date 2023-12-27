import { RpcParamType } from '../constants';

export class RpcParamsFactory {
  public exchangeKeyForValue(type: number, data: string | undefined, args: unknown[]) {
    if (!args) {
      return null;
    }
    switch (type as RpcParamType) {
      case RpcParamType.Payload:
        return data ? args[0]?.[data] : args[0];
      case RpcParamType.Context:
        return args[1];
      case RpcParamType.Call:
        return args[2];
      default:
        return null;
    }
  }
}
