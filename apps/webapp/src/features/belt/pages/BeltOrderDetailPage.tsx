import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import {
  graphql,
  useFragment,
  useLazyLoadQuery,
  useMutation,
} from "react-relay";
import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";
import type { BeltOrderDetailPageAcceptOrderMutation } from "./__generated__/BeltOrderDetailPageAcceptOrderMutation.graphql";
import type { BeltOrderDetailPageCancelOrderMutation } from "./__generated__/BeltOrderDetailPageCancelOrderMutation.graphql";
import type { BeltOrderDetailPageCreateReviewMutation } from "./__generated__/BeltOrderDetailPageCreateReviewMutation.graphql";
import type { BeltOrderDetailPageFinishOrderMutation } from "./__generated__/BeltOrderDetailPageFinishOrderMutation.graphql";
import type { BeltOrderDetailPageMarkPaidMutation } from "./__generated__/BeltOrderDetailPageMarkPaidMutation.graphql";
import type { BeltOrderDetailPageQuery } from "./__generated__/BeltOrderDetailPageQuery.graphql";
import type {
  BeltOrderDetailPage_orderFields$data,
  BeltOrderDetailPage_orderFields$key,
  OrderStatus,
} from "./__generated__/BeltOrderDetailPage_orderFields.graphql";
import type { BeltOrderDetailPageStartOrderMutation } from "./__generated__/BeltOrderDetailPageStartOrderMutation.graphql";
import { BeltStatusBadge } from "../components/BeltStatusBadge";
import { useCurrentMvpUser } from "../../../shared/auth/mvp-auth";
import { getRelayErrorMessage } from "../../../shared/relay/errors";
import {
  Alert,
  Button,
  Field,
  SelectInput,
  Surface,
  TextArea,
} from "../../../shared/ui";

type BeltOrderDetailPageProps = {
  orderId: string;
  view?: "waiting" | "active" | "finish";
};

type OrderAction = "accept" | "start" | "finish" | "cancel" | "mark-paid";

type OrderRecord = BeltOrderDetailPage_orderFields$data;

const ORDER_DETAIL_SELECTION = graphql`
  fragment BeltOrderDetailPage_orderFields on Order {
    id
    ownerId
    walkerId
    dogId
    status
    priceAmount
    priceCurrency
    locationAddress
    startTime
    endTime
    acceptedAt
    startedAt
    finishedAt
    paidAt
  }
`;

function removeOrderFromRootList(
  store: RecordSourceSelectorProxy,
  fieldName: string,
  orderId: string,
) {
  const root = store.getRoot();
  const currentOrders = root.getLinkedRecords(fieldName);
  if (!currentOrders) {
    return;
  }

  root.setLinkedRecords(
    currentOrders.filter((order) => order.getDataID() !== orderId),
    fieldName,
  );
}

function addOrderToRootList(
  store: RecordSourceSelectorProxy,
  fieldName: string,
  order: RecordProxy,
) {
  const root = store.getRoot();
  const currentOrders = root.getLinkedRecords(fieldName) ?? [];
  if (currentOrders.some((item) => item.getDataID() === order.getDataID())) {
    return;
  }

  root.setLinkedRecords([order, ...currentOrders], fieldName);
}

function canReviewOrder(order: OrderRecord, currentUserId: string): boolean {
  if (!isParticipant(order, currentUserId)) {
    return false;
  }

  if (order.status !== "FINISHED" && order.status !== "PAID") {
    return false;
  }

  return order.ownerId !== currentUserId || order.walkerId !== null;
}

function getRevieweeLabel(order: OrderRecord, currentUserId: string): string {
  return order.ownerId === currentUserId ? "walker" : "owner";
}

function isParticipant(order: OrderRecord, currentUserId: string): boolean {
  return order.ownerId === currentUserId || order.walkerId === currentUserId;
}

function canCancelOrder(order: OrderRecord, currentUserId: string): boolean {
  if (!isParticipant(order, currentUserId)) {
    return false;
  }

  if (order.ownerId === currentUserId) {
    return order.status === "CREATED" || order.status === "ACCEPTED";
  }

  return order.walkerId === currentUserId && order.status === "ACCEPTED";
}

function getAvailableActions(
  order: OrderRecord,
  currentUser: ReturnType<typeof useCurrentMvpUser>,
): OrderAction[] {
  const currentUserId = String(currentUser.id);
  const isOwner = order.ownerId === currentUserId;
  const isAssignedWalker = order.walkerId === currentUserId;
  const isWalker = currentUser.roles.includes("WALKER");
  const actions: OrderAction[] = [];

  if (order.status === "CREATED" && !order.walkerId && isWalker && !isOwner) {
    actions.push("accept");
  }

  if (order.status === "ACCEPTED" && isAssignedWalker) {
    actions.push("start");
  }

  if (order.status === "STARTED" && isAssignedWalker) {
    actions.push("finish");
  }

  if (order.status === "FINISHED" && isOwner) {
    actions.push("mark-paid");
  }

  if (canCancelOrder(order, currentUserId)) {
    actions.push("cancel");
  }

  return actions;
}

function getOrderStateMessage(
  status: OrderStatus,
  isParticipantForCurrentUser: boolean,
): string {
  switch (status) {
    case "CREATED":
      return isParticipantForCurrentUser
        ? "Waiting for a walker to accept this walk."
        : "This walk is available for walkers.";
    case "ACCEPTED":
      return "A walker accepted this walk. The assigned walker can start it.";
    case "STARTED":
      return "This walk is active. The assigned walker can finish it.";
    case "FINISHED":
      return "The walk is finished. The owner can mark it paid.";
    case "PAID":
      return "This walk is paid and complete.";
    case "CANCELLED":
      return "This walk was cancelled.";
    case "%future added value":
      return "This order is in an unknown state.";
  }
}

function getActionLabel(action: OrderAction): string {
  switch (action) {
    case "accept":
      return "Accept";
    case "start":
      return "Start";
    case "finish":
      return "Finish";
    case "cancel":
      return "Cancel";
    case "mark-paid":
      return "Mark paid";
  }
}

function getActionInFlightLabel(action: OrderAction): string {
  switch (action) {
    case "accept":
      return "Accepting...";
    case "start":
      return "Starting...";
    case "finish":
      return "Finishing...";
    case "cancel":
      return "Cancelling...";
    case "mark-paid":
      return "Saving...";
  }
}

function getNextPath(orderId: string, action: OrderAction): string {
  switch (action) {
    case "start":
      return `/orders/${orderId}/active`;
    case "finish":
      return `/orders/${orderId}/finish`;
    case "cancel":
    case "mark-paid":
    case "accept":
      return `/orders/${orderId}`;
  }
}

export function BeltOrderDetailPage({
  orderId,
  view,
}: BeltOrderDetailPageProps) {
  const navigate = useNavigate();
  const currentUser = useCurrentMvpUser();
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<OrderAction | null>(null);
  const data = useLazyLoadQuery<BeltOrderDetailPageQuery>(
    graphql`
      query BeltOrderDetailPageQuery($id: ID!) {
        order(id: $id) {
          ...BeltOrderDetailPage_orderFields
        }
        myReviews {
          id
          orderId
          reviewerId
          revieweeId
          rating
          comment
          createdAt
        }
      }
    `,
    { id: orderId },
    { fetchPolicy: "store-and-network" },
  );
  const order = useFragment<BeltOrderDetailPage_orderFields$key>(
    ORDER_DETAIL_SELECTION,
    data.order,
  );
  const [commitAcceptOrder] =
    useMutation<BeltOrderDetailPageAcceptOrderMutation>(graphql`
      mutation BeltOrderDetailPageAcceptOrderMutation($id: ID!) {
        acceptOrder(id: $id) {
          ...BeltOrderDetailPage_orderFields
        }
      }
    `);
  const [commitStartOrder] = useMutation<BeltOrderDetailPageStartOrderMutation>(
    graphql`
      mutation BeltOrderDetailPageStartOrderMutation($id: ID!) {
        startOrder(id: $id) {
          ...BeltOrderDetailPage_orderFields
        }
      }
    `,
  );
  const [commitFinishOrder] =
    useMutation<BeltOrderDetailPageFinishOrderMutation>(graphql`
      mutation BeltOrderDetailPageFinishOrderMutation($id: ID!) {
        finishOrder(id: $id) {
          ...BeltOrderDetailPage_orderFields
        }
      }
    `);
  const [commitCancelOrder] =
    useMutation<BeltOrderDetailPageCancelOrderMutation>(graphql`
      mutation BeltOrderDetailPageCancelOrderMutation(
        $id: ID!
        $input: CancelOrderInput
      ) {
        cancelOrder(id: $id, input: $input) {
          ...BeltOrderDetailPage_orderFields
        }
      }
    `);
  const [commitMarkPaid] = useMutation<BeltOrderDetailPageMarkPaidMutation>(
    graphql`
      mutation BeltOrderDetailPageMarkPaidMutation($id: ID!) {
        markOrderPaid(id: $id) {
          ...BeltOrderDetailPage_orderFields
        }
      }
    `,
  );
  const [commitCreateReview] =
    useMutation<BeltOrderDetailPageCreateReviewMutation>(graphql`
      mutation BeltOrderDetailPageCreateReviewMutation(
        $orderId: ID!
        $input: CreateReviewInput!
      ) {
        createOrderReview(orderId: $orderId, input: $input) {
          id
          orderId
          reviewerId
          revieweeId
          rating
          comment
          createdAt
        }
      }
    `);
  const currentUserId = String(currentUser.id);
  const actions = getAvailableActions(order, currentUser);
  const isActionInFlight = activeAction !== null;
  const existingReview = data.myReviews.find(
    (review) =>
      review.orderId === order.id && review.reviewerId === currentUserId,
  );
  const canReview = canReviewOrder(order, currentUserId);
  const shouldShowReviewPanel =
    view === "finish" || canReview || existingReview !== undefined;
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  function commitAction(action: OrderAction) {
    const variables = { id: orderId };
    setActionError(null);
    setActiveAction(action);

    const completeAction = () => {
      setActiveAction(null);
      void navigate(getNextPath(orderId, action));
    };
    const handleError = (error: Error) => {
      setActiveAction(null);
      setActionError(getRelayErrorMessage(error));
    };

    switch (action) {
      case "accept":
        commitAcceptOrder({
          variables,
          updater: (store) => {
            const acceptedOrder = store.getRootField("acceptOrder");
            removeOrderFromRootList(store, "availableOrders", orderId);
            if (acceptedOrder) {
              addOrderToRootList(store, "myWalkerOrders", acceptedOrder);
            }
          },
          onCompleted: completeAction,
          onError: handleError,
        });
        break;
      case "start":
        commitStartOrder({
          variables,
          onCompleted: completeAction,
          onError: handleError,
        });
        break;
      case "finish":
        commitFinishOrder({
          variables,
          onCompleted: completeAction,
          onError: handleError,
        });
        break;
      case "cancel":
        commitCancelOrder({
          variables: { ...variables, input: { reason: null } },
          updater: (store) => {
            removeOrderFromRootList(store, "availableOrders", orderId);
          },
          onCompleted: completeAction,
          onError: handleError,
        });
        break;
      case "mark-paid":
        commitMarkPaid({
          variables,
          onCompleted: completeAction,
          onError: handleError,
        });
        break;
    }
  }

  function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewError(null);
    setIsReviewSubmitting(true);

    commitCreateReview({
      variables: {
        orderId,
        input: {
          rating: Number.parseInt(reviewRating, 10),
          comment: reviewComment.trim() || null,
        },
      },
      updater: (store) => {
        const review = store.getRootField("createOrderReview");
        if (review) {
          addOrderToRootList(store, "myReviews", review);
        }
      },
      onCompleted: () => {
        setIsReviewSubmitting(false);
        setReviewComment("");
      },
      onError: (error) => {
        setIsReviewSubmitting(false);
        setReviewError(getRelayErrorMessage(error));
      },
    });
  }

  const stateMessage = getOrderStateMessage(
    order.status,
    isParticipant(order, currentUserId),
  );

  return (
    <Surface framed>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
            {view ? `${view} view` : "Order detail"}
          </p>
          <h2 className="m-0 text-xl font-semibold">{order.locationAddress}</h2>
        </div>
        <BeltStatusBadge status={order.status} />
      </div>

      <p className="m-0 text-sm text-muted-foreground">{stateMessage}</p>
      {actionError ? <Alert>{actionError}</Alert> : null}

      <dl className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        <div>
          <dt className="text-xs text-muted-foreground">Dog</dt>
          <dd className="m-0 font-semibold">{order.dogId}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="m-0 font-semibold">{order.ownerId}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Walker</dt>
          <dd className="m-0 font-semibold">
            {order.walkerId ?? "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Price</dt>
          <dd className="m-0 font-semibold">
            {order.priceAmount} {order.priceCurrency}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Start</dt>
          <dd className="m-0 font-semibold">
            {new Date(order.startTime).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">End</dt>
          <dd className="m-0 font-semibold">
            {new Date(order.endTime).toLocaleString()}
          </dd>
        </div>
      </dl>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              variant={action === "cancel" ? "secondary" : "primary"}
              disabled={isActionInFlight}
              onClick={() => commitAction(action)}
            >
              {activeAction === action
                ? getActionInFlightLabel(action)
                : getActionLabel(action)}
            </Button>
          ))}
        </div>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">
          No actions are available for your current role and this order state.
        </p>
      )}

      {shouldShowReviewPanel ? (
        <section className="grid gap-3 border-t border-border pt-4">
          <div>
            <p className="m-0 text-xs font-bold uppercase text-muted-foreground">
              Completion
            </p>
            <h3 className="m-0 text-lg font-semibold">Review walk</h3>
          </div>

          {existingReview ? (
            <dl className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
              <div>
                <dt className="text-xs text-muted-foreground">Your rating</dt>
                <dd className="m-0 font-semibold">{existingReview.rating}/5</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Reviewed</dt>
                <dd className="m-0 font-semibold">
                  {new Date(existingReview.createdAt).toLocaleString()}
                </dd>
              </div>
              {existingReview.comment ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Comment</dt>
                  <dd className="m-0 font-semibold">
                    {existingReview.comment}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : canReview ? (
            <form
              aria-busy={isReviewSubmitting}
              className="grid gap-3"
              onSubmit={handleReviewSubmit}
            >
              <p className="m-0 text-sm text-muted-foreground">
                Rate the {getRevieweeLabel(order, currentUserId)} for this walk.
              </p>
              {reviewError ? <Alert>{reviewError}</Alert> : null}
              <fieldset
                className="grid gap-3 border-0 p-0"
                disabled={isReviewSubmitting || isActionInFlight}
              >
                <Field label="Rating">
                  <SelectInput
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Fine</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Bad</option>
                  </SelectInput>
                </Field>
                <Field label="Comment">
                  <TextArea
                    rows={4}
                    maxLength={500}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                  />
                </Field>
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isReviewSubmitting || isActionInFlight}
                >
                  {isReviewSubmitting ? "Saving..." : "Submit review"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              Reviews become available after a participant finishes the walk.
            </p>
          )}
        </section>
      ) : null}
    </Surface>
  );
}
