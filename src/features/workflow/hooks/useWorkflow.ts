@@ .. @@
  /**
   * طلب موافقة على خطاب
   */
  const requestApproval = useCallback(async (
    letterId: string,
    approverId: string,
    comments?: string,
    dueDate?: Date | string
  ) => {
    return await createRequest({
      letterId,
      approverId,
      comments,
      dueDate
    });
  }, [createRequest]);
  
  return {
    isLoading,
    requestApproval,
-    approveRequest,
-    rejectRequest,
+    approveRequest: (requestId: string, comments?: string, signatureId?: string) => 
+      approveRequest(requestId, comments, signatureId),
+    rejectRequest: (requestId: string, reason: string) => 
+      rejectRequest(requestId, reason),
    getPendingApprovals,
    getMyRequests,
    getAvailableApprovers,
    getApprovalLogs,
    updateWorkflowStatus,
    getWorkflowStatus
  };