@@ .. @@
 import { useState, useEffect } from 'react';
-import { CheckCircle, ThumbsDown, AlertCircle } from 'lucide-react';
+import { CheckCircle, ThumbsDown, AlertCircle, Camera, Upload } from 'lucide-react';
 import { useApprovalDecisions } from '../hooks/useApprovalDecisions';
 import { ApprovalRequest, Signature } from '../../../types/database';
 import { supabase } from '../../../lib/supabase';
@@ .. @@
   
   return (
     <div className="space-y-4">
-      {/* اختيار الإجراء */}
-      <div className="p-4">
-        <div className="flex rounded-md overflow-hidden">
+      {/* اختيار نوع الإجراء */}
+      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
+        <div className="flex rounded-lg overflow-hidden shadow-sm">
           <button
             type="button"
-            className={`flex-1 py-2 text-sm font-medium ${
+            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
               tab === 'approve'
-                ? 'bg-primary text-white'
-                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
+                ? 'bg-primary text-white shadow-sm'
+                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
             }`}
             onClick={() => setTab('approve')}
           >
-            <CheckCircle className="h-4 w-4 inline-block ml-1" />
+            <CheckCircle className="h-4 w-4" />
             موافقة
           </button>
           <button
             type="button"
-            className={`flex-1 py-2 text-sm font-medium ${
+            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
               tab === 'reject'
-                ? 'bg-red-500 text-white'
-                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
+                ? 'bg-red-500 text-white shadow-sm'
+                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
             }`}
             onClick={() => setTab('reject')}
           >
-            <ThumbsDown className="h-4 w-4 inline-block ml-1" />
+            <ThumbsDown className="h-4 w-4" />
             رفض
           </button>
         </div>
       </div>

       {/* نموذج الموافقة */}
       {tab === 'approve' && (
-        <div className="p-4 space-y-4">
+        <div className="p-4 space-y-6">
           {signatures.length > 0 ? (
             <div>
-              <label className="block text-sm font-medium mb-2">
+              <label className="block text-sm font-medium mb-3">
                 اختيار التوقيع
               </label>
-              <div className="grid grid-cols-2 gap-3">
+              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {signatures.map((sig) => (
                   <div
                     key={sig.id}
                     onClick={() => setSelectedSignatureId(sig.id)}
-                    className={`border p-3 rounded-lg cursor-pointer ${
+                    className={`border p-4 rounded-lg cursor-pointer transition-all ${
                       selectedSignatureId === sig.id
-                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
-                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
+                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
+                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                     }`}
                   >
-                    <div className="bg-white dark:bg-gray-800 p-2 rounded flex justify-center items-center h-24">
+                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg flex justify-center items-center h-28 mb-2">
                       <img
                         src={sig.signature_url}
                         alt="التوقيع"
                         className="max-h-full object-contain"
                       />
                     </div>
-                    <div className="mt-2 flex items-center justify-between">
-                      <span className="text-xs text-gray-500">
+                    <div className="flex items-center justify-between">
+                      <span className="text-xs text-gray-500 dark:text-gray-400">
                         {new Date(sig.created_at).toLocaleDateString()}
                       </span>
                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                         selectedSignatureId === sig.id 
-                          ? 'bg-primary border-primary text-white' 
+                          ? 'bg-primary border-primary text-white shadow-sm' 
                           : 'border-gray-300 dark:border-gray-600'
                       }`}>
                         {selectedSignatureId === sig.id && (
@@ .. @@
               </div>
             </div>
           ) : (
-            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
-              <AlertCircle className="h-5 w-5 flex-shrink-0" />
-              <div>
-                <p className="font-medium">لم يتم العثور على توقيع لديك</p>
-                <p className="text-sm">يرجى رفع توقيعك من صفحة الإعدادات قبل الموافقة على الخطاب</p>
+            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-5 text-yellow-800 dark:text-yellow-300">
+              <div className="flex items-center gap-3 mb-3">
+                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
+                  <AlertCircle className="h-5 w-5" />
+                </div>
+                <div>
+                  <p className="font-bold">لم يتم العثور على توقيع لديك</p>
+                  <p className="text-sm">يجب رفع توقيعك قبل الموافقة على الخطاب</p>
+                </div>
+              </div>
+              <div className="mt-4 flex flex-col sm:flex-row gap-2">
+                <button
+                  type="button"
+                  className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors"
+                  onClick={() => window.open('/admin/settings', '_blank')}
+                >
+                  <Upload className="h-4 w-4" />
+                  <span>رفع توقيع جديد</span>
+                </button>
+                <button
+                  type="button"
+                  className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors"
+                >
+                  <Camera className="h-4 w-4" />
+                  <span>التقاط توقيع</span>
+                </button>
               </div>
             </div>
           )}

           <div>
-            <label htmlFor="comments" className="block text-sm font-medium mb-2">
+            <label htmlFor="comments" className="block text-sm font-medium mb-2 flex items-center gap-1.5">
+              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
+                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
+              </svg>
               ملاحظات (اختياري)
             </label>
             <textarea
               id="comments"
               value={comments}
               onChange={(e) => setComments(e.target.value)}
-              className="w-full p-3 border dark:border-gray-700 rounded-lg h-24 resize-none"
+              className="w-full p-3 border dark:border-gray-700 rounded-lg h-24 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
               placeholder="أضف أي ملاحظات أو تعليقات على الموافقة..."
             />
           </div>
           
-          <div className="pt-4">
+          <div className="pt-4 border-t dark:border-gray-800">
             <button
               type="button"
               onClick={handleApprove}
               disabled={isLoading || (!selectedSignatureId && signatures.length > 0)}
-              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
+              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
             >
               {isLoading ? (
                 <>
@@ .. @@
       )}

       {/* نموذج الرفض */}
       {tab === 'reject' && (
-        <div className="p-4 space-y-4">
-          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-red-800 dark:text-red-300 flex items-center gap-2">
-            <AlertCircle className="h-5 w-5 flex-shrink-0" />
-            <p>
-              سيتم إعادة الخطاب إلى المرسل مع توضيح سبب الرفض.
-            </p>
+        <div className="p-4 space-y-6">
+          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 text-red-800 dark:text-red-300">
+            <div className="flex items-center gap-3 mb-1">
+              <AlertCircle className="h-5 w-5 flex-shrink-0" />
+              <p className="font-medium">
+                تنبيه قبل الرفض
+              </p>
+            </div>
+            <p className="text-sm mr-8">
+              عند رفض الخطاب، سيتم إعادته إلى المرسل مع توضيح سبب الرفض، ويمكنه إجراء التعديلات المطلوبة وإعادة إرساله.
+            </p>
           </div>

           <div>
-            <label htmlFor="rejectionReason" className="block text-sm font-medium mb-2">
+            <label htmlFor="rejectionReason" className="block text-sm font-medium mb-2 flex items-center gap-1.5">
+              <ThumbsDown className="h-4 w-4 text-red-500" />
               سبب الرفض <span className="text-red-500">*</span>
             </label>
             <textarea
               id="rejectionReason"
               value={rejectionReason}
               onChange={(e) => setRejectionReason(e.target.value)}
-              className="w-full p-3 border dark:border-gray-700 rounded-lg h-24 resize-none"
+              className="w-full p-3 border dark:border-gray-700 rounded-lg h-32 resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
               placeholder="يرجى توضيح سبب رفض الخطاب..."
               required
             />
           </div>
           
-          <div className="pt-4">
+          <div className="pt-4 border-t dark:border-gray-800">
             <button
               type="button"
               onClick={handleReject}
               disabled={isLoading || !rejectionReason.trim()}
-              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
+              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
             >
               {isLoading ? (
                 <>
@@ .. @@
                 </>
               ) : (
                 <>
-                  <ThumbsDown className="h-4 w-4" />
+                  <ThumbsDown className="h-5 w-5" />
                   <span>رفض</span>
                 </>
               )}
             </button>
           </div>
         </div>
       )}
     </div>
   );
 }