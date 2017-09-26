import CustomElementInternals from '../CustomElementInternals.js';
import {
  descriptors as DocumentFragmentDesc,
  proto as DocumentFragmentProto,
} from '../Environment/DocumentFragment.js';
import PatchParentNode from './Interface/ParentNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  PatchParentNode(internals, DocumentFragmentProto, {
    prepend: (DocumentFragmentDesc.prepend || {}).value,
    append: (DocumentFragmentDesc.append || {}).value,
  });
};
