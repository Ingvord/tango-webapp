<%@ page import = "java.io.*,java.util.*" %>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>

<html>
<head>
    <meta http-equiv="Content-Type"  content="text/html; charset=UTF-8" />
    <title>Page Redirection</title>
</head>

<body>

<%
    response.setStatus(response.SC_MOVED_TEMPORARILY);
    response.setHeader("Location", "apps/login/index.jsp");
%>

</body>
</html>