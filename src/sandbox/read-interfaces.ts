import { getConstructorName, isValidMemberName } from '../utils';
import { InterfaceInfo, InterfaceType, MemberTypeInfo } from '../types';
import { mainCtx } from './main-context';

export const readMainInterfaces = (sandboxWindow: Window, sandboxDocument: Document) => {
  const docImpl = sandboxDocument.implementation.createHTMLDocument();
  const docElement = docImpl.documentElement;

  const implementations: [InterfaceType, any][] = [
    [InterfaceType.Window, sandboxWindow],
    [InterfaceType.Document, docImpl],
    [InterfaceType.DOMTokenList, docElement.classList],
    [InterfaceType.Element, docElement],
    [InterfaceType.History, mainCtx.$history$],
    [InterfaceType.NodeList, docElement.childNodes],
    [InterfaceType.Storage, mainCtx.$sessionStorage$],
    [InterfaceType.TextNode, docImpl.createTextNode('')],
  ];

  return implementations.map(([interfaceType, impl]) => {
    const memberTypeInfo = readImplementationMembers(impl, {});
    const interfaceInfo: InterfaceInfo = [interfaceType, memberTypeInfo];
    return interfaceInfo;
  });
};

const readImplementationMembers = (impl: any, members: MemberTypeInfo) => {
  let memberName: string;
  let interfaceType: InterfaceType;
  let value: any;
  let type: string;

  for (memberName in impl) {
    if (isValidMemberName(memberName)) {
      value = impl[memberName];
      type = typeof value;
      if (type === 'function') {
        members[memberName] = InterfaceType.Method;
      } else if (type === 'object') {
        interfaceType = InterfaceWhitelist[getConstructorName(value)];
        if (interfaceType) {
          members[memberName] = interfaceType;
        }
      }
    }
  }

  return members;
};

const InterfaceWhitelist: { [key: string]: InterfaceType } = {
  CSSStyleDeclaration: InterfaceType.CSSStyleDeclaration,
  DOMStringMap: InterfaceType.DOMStringMap,
  DOMTokenList: InterfaceType.DOMTokenList,
  NamedNodeMap: InterfaceType.NamedNodeMap,
  NodeList: InterfaceType.NodeList,
};
