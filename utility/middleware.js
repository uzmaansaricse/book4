// const authMiddleware = (req, res, next) => {
//     const authHeader = req.headers.authorization;

//     console.log("Auth Header:", authHeader);  // ✅ Debug

//     if (!authHeader) {
//         return res.status(401).json({ message: "Unauthorized access! No token provided." });
//     }

//     try {
//         const token = authHeader.split(" ")[1];  // Bearer Token Extract
//         const decoded = jwt.verify(token, JWT_SECRET);
        
//         console.log("Decoded Token:", decoded);  // ✅ Debug

//         if (decoded.role === "admin") {
//             req.user = decoded;
//             next();
//         } else {
//             return res.status(403).json({ message: "Access denied! You are not an admin." });
//         }
//     } catch (error) {
//         return res.status(401).json({ message: "Invalid or expired token!" });
//     }
// };

// export {authMiddleware};