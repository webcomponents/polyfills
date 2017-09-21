import CustomElementInternals from '../CustomElementInternals.js';
import {descriptors as DocumentFragmentDesc} from '../Environment/DocumentFragment.js';
import PatchParentNode from './Interface/ParentNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  PatchParentNode(internals, DocumentFragment.prototype, {
    prepend: (DocumentFragmentDesc.prepend || {}).value,
    append: (DocumentFragmentDesc.append || {}).value,
  });
};
