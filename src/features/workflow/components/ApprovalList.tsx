@@ .. @@
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
-                           <span className="font-medium">{moment(requestDate).format('iYYYY/iM/iD')}</span>
+                           <span className="font-medium">{new Date(requestDate).toLocaleDateString('ar-SA')}</span>
                          </div>