import { assoc, dissoc, propOr } from 'ramda';
import { delEditContext, notify, setEditContext } from '../database/redis';
import {
  createRelation,
  deleteRelationById,
  deleteRelationsByFromAndTo,
  escapeString,
  executeWrite,
  findWithConnectedRelations,
  getRelationInferredById,
  internalLoadEntityById,
  listRelations,
  load,
  loadEntityById,
  loadRelationById,
  updateAttribute,
} from '../database/grakn';
import { BUS_TOPICS } from '../config/conf';
import { FunctionalError } from '../config/errors';
import { elCount } from '../database/elasticSearch';
import { buildPagination, INDEX_STIX_CORE_RELATIONSHIPS } from '../database/utils';
import {
  isStixId,
  isInternalId,
  ABSTRACT_STIX_CORE_RELATIONSHIP,
  ENTITY_TYPE_LABEL,
  ENTITY_TYPE_IDENTITY,
  ENTITY_TYPE_CONTAINER_REPORT,
  RELATION_CREATED_BY,
  RELATION_OBJECT,
  RELATION_OBJECT_LABEL,
  RELATION_OBJECT_MARKING,
  RELATION_KILL_CHAIN_PHASE,
  RELATION_EXTERNAL_REFERENCE,
  ENTITY_TYPE_CONTAINER_NOTE,
  ENTITY_TYPE_CONTAINER_OPINION,
  ENTITY_TYPE_MARKING_DEFINITION,
  ENTITY_TYPE_KILL_CHAIN_PHASE,
  ENTITY_TYPE_EXTERNAL_REFERENCE,
  isStixMetaRelationship,
  ABSTRACT_STIX_META_RELATIONSHIP,
  isStixCoreRelationship,
} from '../utils/idGenerator';

export const findAll = async (args) => {
  return listRelations(propOr('stix-core-relationship', 'relationship_type', args), args);
};

export const findById = (stixCoreRelationshipId) => {
  if (!isStixId(stixCoreRelationshipId) && !isInternalId(stixCoreRelationshipId)) {
    return getRelationInferredById(stixCoreRelationshipId);
  }
  return loadRelationById(stixCoreRelationshipId, 'stix-core-relationship');
};

export const stixCoreRelationshipsNumber = (args) => {
  const types = [];
  if (args.type) {
    if (isStixCoreRelationship(args.type)) {
      types.push(args.type);
    }
  }
  if (types.length === 0) {
    types.push(ABSTRACT_STIX_CORE_RELATIONSHIP);
  }
  const finalArgs = assoc('types', types, args);
  return {
    count: elCount(INDEX_STIX_CORE_RELATIONSHIPS, finalArgs),
    total: elCount(INDEX_STIX_CORE_RELATIONSHIPS, dissoc('endDate', finalArgs)),
  };
};

export const createdBy = async (stixCoreRelationshipId) => {
  const element = await load(
    `match $to isa ${ENTITY_TYPE_IDENTITY}; 
    $rel(${RELATION_CREATED_BY}_from:$from, ${RELATION_CREATED_BY}_to: $to) isa ${RELATION_CREATED_BY};
    $from has internal_id "${escapeString(stixCoreRelationshipId)}"; get;`,
    ['to']
  );
  return element && element.to;
};

export const reports = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $from isa ${ENTITY_TYPE_CONTAINER_REPORT}, has internal_id $from_id;
    $rel(${RELATION_OBJECT}_from:$from ${RELATION_OBJECT}_to:$to) isa ${RELATION_OBJECT}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $to has internal_id "${escapeString(stixCoreRelationshipId)}";
    get;`,
    'from',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const notes = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $from isa ${ENTITY_TYPE_CONTAINER_NOTE}, has internal_id $from_id; 
    $rel(${RELATION_OBJECT}_from:$from, ${RELATION_OBJECT}_to:$to) isa ${RELATION_OBJECT}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $to has internal_id "${escapeString(stixCoreRelationshipId)}";
    get;`,
    'from',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const opinions = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $from isa ${ENTITY_TYPE_CONTAINER_OPINION}, has internal_id $from_id;
    $rel(${RELATION_OBJECT}_from:$from, ${RELATION_OBJECT}_to:$to) isa ${RELATION_OBJECT}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $to has internal_id "${escapeString(stixCoreRelationshipId)}";
    get;`,
    'from',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const labels = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $to isa ${ENTITY_TYPE_LABEL}, has internal_id $to_id; 
    $rel(${RELATION_OBJECT_LABEL}_from:$from, ${RELATION_OBJECT_LABEL}_to:$to) isa ${RELATION_OBJECT_LABEL}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $from has internal_id "${escapeString(stixCoreRelationshipId)}";
    get;`,
    'to',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const markingDefinitions = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $to isa ${ENTITY_TYPE_MARKING_DEFINITION}, has internal_id $to_id;
    $rel(${RELATION_OBJECT_MARKING}_from:$from, ${RELATION_OBJECT_MARKING}_to:$to) isa ${RELATION_OBJECT_MARKING}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $from has internal_id "${escapeString(stixCoreRelationshipId)}"; 
    get;`,
    'to',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const killChainPhases = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $to isa ${ENTITY_TYPE_KILL_CHAIN_PHASE}, has internal_id $to_id;
    $rel(${RELATION_KILL_CHAIN_PHASE}_from:$from, ${RELATION_KILL_CHAIN_PHASE}_to:$to) isa ${RELATION_KILL_CHAIN_PHASE}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $from has internal_id "${escapeString(stixCoreRelationshipId)}";
    get;`,
    'to',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const externalReferences = (stixCoreRelationshipId) => {
  return findWithConnectedRelations(
    `match $to isa ${ENTITY_TYPE_EXTERNAL_REFERENCE}, has internal_id $to_id;
    $rel(${RELATION_EXTERNAL_REFERENCE}_from:$from, ${RELATION_EXTERNAL_REFERENCE}_to:$to) isa ${RELATION_EXTERNAL_REFERENCE}, has internal_id $rel_id;
    $from has internal_id $rel_from_id;
    $to has internal_id $rel_to_id;
    $from has internal_id "${escapeString(stixCoreRelationshipId)}";
    get;`,
    'to',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const stixRelations = (stixCoreObjectId, args) => {
  const finalArgs = assoc('fromId', stixCoreObjectId, args);
  return findAll(finalArgs);
};

// region mutations
export const addStixCoreRelationship = async (user, stixCoreRelationship) => {
  const created = await createRelation(user, stixCoreRelationship);
  return notify(BUS_TOPICS[ABSTRACT_STIX_CORE_RELATIONSHIP].ADDED_TOPIC, created, user);
};

export const stixCoreRelationshipDelete = async (user, stixCoreRelationshipId) => {
  return deleteRelationById(user, stixCoreRelationshipId, ABSTRACT_STIX_CORE_RELATIONSHIP);
};

export const stixCoreRelationshipEditField = (user, stixCoreRelationshipId, input) => {
  return executeWrite((wTx) => {
    return updateAttribute(user, stixCoreRelationshipId, ABSTRACT_STIX_CORE_RELATIONSHIP, input, wTx);
  }).then(async () => {
    const stixCoreRelationship = await loadRelationById(stixCoreRelationshipId, ABSTRACT_STIX_CORE_RELATIONSHIP);
    return notify(BUS_TOPICS[ABSTRACT_STIX_CORE_RELATIONSHIP].EDIT_TOPIC, stixCoreRelationship, user);
  });
};

export const stixCoreRelationshipAddRelation = async (user, stixCoreRelationshipId, input) => {
  const stixCoreRelationship = await internalLoadEntityById(stixCoreRelationshipId);
  if (!stixCoreRelationship) {
    throw FunctionalError('Cannot add the relation, stix-core-relationship cannot be found.');
  }
  if (!isStixMetaRelationship(input.relationship_type)) {
    throw FunctionalError(`Only ${ABSTRACT_STIX_META_RELATIONSHIP} can be added through this method.`);
  }
  const finalInput = assoc('fromId', stixCoreRelationshipId, input);
  return createRelation(user, finalInput).then((relationData) => {
    notify(BUS_TOPICS[ABSTRACT_STIX_CORE_RELATIONSHIP].EDIT_TOPIC, relationData, user);
    return relationData;
  });
};

export const stixCoreRelationshipDeleteRelation = async (user, stixCoreRelationshipId, toId, relationshipType) => {
  const stixCoreRelationship = await loadEntityById(stixCoreRelationshipId, ABSTRACT_STIX_CORE_RELATIONSHIP);
  if (!stixCoreRelationship) {
    throw FunctionalError(`Cannot delete the relation, ${ABSTRACT_STIX_CORE_RELATIONSHIP} cannot be found.`);
  }
  if (!isStixMetaRelationship(relationshipType)) {
    throw FunctionalError(`Only ${ABSTRACT_STIX_META_RELATIONSHIP} can be deleted through this method.`);
  }
  await deleteRelationsByFromAndTo(
    user,
    stixCoreRelationshipId,
    toId,
    relationshipType,
    ABSTRACT_STIX_META_RELATIONSHIP
  );
  return notify(BUS_TOPICS[ABSTRACT_STIX_CORE_RELATIONSHIP].EDIT_TOPIC, stixCoreRelationship, user);
};
// endregion

// region context
export const stixCoreRelationshipCleanContext = (user, stixCoreRelationshipId) => {
  delEditContext(user, stixCoreRelationshipId);
  return loadRelationById(stixCoreRelationshipId, ABSTRACT_STIX_CORE_RELATIONSHIP).then((stixCoreRelationship) =>
    notify(BUS_TOPICS[ABSTRACT_STIX_CORE_RELATIONSHIP].EDIT_TOPIC, stixCoreRelationship, user)
  );
};

export const stixCoreRelationshipEditContext = (user, stixCoreRelationshipId, input) => {
  setEditContext(user, stixCoreRelationshipId, input);
  return loadRelationById(stixCoreRelationshipId, ABSTRACT_STIX_CORE_RELATIONSHIP).then((stixCoreRelationship) =>
    notify(BUS_TOPICS[ABSTRACT_STIX_CORE_RELATIONSHIP].EDIT_TOPIC, stixCoreRelationship, user)
  );
};
// endregion
