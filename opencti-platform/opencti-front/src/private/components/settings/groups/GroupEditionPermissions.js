import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import {
  compose, map, pathOr, pipe, propEq, find, filter,
} from 'ramda';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Checkbox from '@material-ui/core/Checkbox';
import Avatar from '@material-ui/core/Avatar';
import Alert from '@material-ui/lab/Alert/Alert';
import { commitMutation, QueryRenderer } from '../../../../relay/environment';
import inject18n from '../../../../components/i18n';
import { markingDefinitionsLinesSearchQuery } from '../marking_definitions/MarkingDefinitionsLines';

const styles = (theme) => ({
  list: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
  avatar: {
    backgroundColor: theme.palette.primary.main,
  },
});

const groupMutationRelationAdd = graphql`
  mutation GroupEditionPermissionsMarkingDefinitionsRelationAddMutation(
    $id: ID!
    $input: InternalRelationshipAddInput
  ) {
    groupEdit(id: $id) {
      relationAdd(input: $input) {
        from {
          ...GroupEditionPermissions_group
        }
      }
    }
  }
`;

const groupMutationRelationDelete = graphql`
  mutation GroupEditionPermissionsMarkingDefinitionsRelationDeleteMutation(
    $id: ID!
    $toId: String!
    $relationship_type: String!
  ) {
    groupEdit(id: $id) {
      relationDelete(toId: $toId, relationship_type: $relationship_type) {
        ...GroupEditionPermissions_group
      }
    }
  }
`;

class GroupEditionPermissionsComponent extends Component {
  handleToggle(markingDefinitionId, groupMarkingDefinition, event) {
    if (event.target.checked) {
      commitMutation({
        mutation: groupMutationRelationAdd,
        variables: {
          id: this.props.group.id,
          input: {
            toId: markingDefinitionId,
            relationship_type: 'accesses-to',
          },
        },
      });
    } else if (groupMarkingDefinition !== undefined) {
      commitMutation({
        mutation: groupMutationRelationDelete,
        variables: {
          id: this.props.group.id,
          toId: markingDefinitionId,
          relationship_type: 'accesses-to',
        },
      });
    }
  }

  render() {
    const { classes, group, t } = this.props;
    const groupMarkingDefinitions = group.allowed_marking || [];
    return (
      <div style={{ paddingTop: 15 }}>
        <Alert severity="warning" style={{ marginBottom: 10 }}>
          {t(
            'Groups marking definitions will filter the stream consumer to only data he can access to.',
          )}
        </Alert>
        <QueryRenderer
          query={markingDefinitionsLinesSearchQuery}
          variables={{ search: '' }}
          render={({ props }) => {
            if (props) {
              // Done
              const markingDefinitions = pipe(
                pathOr([], ['markingDefinitions', 'edges']),
                map((n) => n.node),
                filter((n) => n.definition_type !== 'statement'),
              )(props);
              return (
                <List dense={true} className={classes.root}>
                  {markingDefinitions.map((markingDefinition) => {
                    const groupMarkingDefinition = find(
                      propEq('id', markingDefinition.id),
                    )(groupMarkingDefinitions);
                    return (
                      <ListItem key={markingDefinition.id} divider={true}>
                        <ListItemAvatar>
                          <Avatar className={classes.avatar}>
                            {markingDefinition.definition.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={markingDefinition.definition} />
                        <ListItemSecondaryAction>
                          <Checkbox
                            onChange={this.handleToggle.bind(
                              this,
                              markingDefinition.id,
                              groupMarkingDefinition,
                            )}
                            checked={groupMarkingDefinition !== undefined}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              );
            }
            // Loading
            return <List> &nbsp; </List>;
          }}
        />
      </div>
    );
  }
}

GroupEditionPermissionsComponent.propTypes = {
  classes: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
  group: PropTypes.object,
};

const GroupEditionPermissions = createFragmentContainer(
  GroupEditionPermissionsComponent,
  {
    group: graphql`
      fragment GroupEditionPermissions_group on Group {
        id
        allowed_marking {
          id
        }
      }
    `,
  },
);

export default compose(
  inject18n,
  withStyles(styles, { withTheme: true }),
)(GroupEditionPermissions);
